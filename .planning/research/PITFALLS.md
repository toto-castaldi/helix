# Domain Pitfalls: MCP Server for Claude Code

**Domain:** MCP server on Supabase Edge Functions, targeting Claude Code as primary client
**Researched:** 2026-02-21
**Confidence:** HIGH (official docs, existing codebase analysis, confirmed bug reports)

---

## Critical Pitfalls

Mistakes that cause the MCP server to not work at all with Claude Code, or that require fundamental rearchitecting.

---

### Pitfall 1: Claude Code HTTP Header Bugs Break Custom Authentication

**What goes wrong:** Claude Code has documented, recurring bugs where custom HTTP headers configured via `.mcp.json` or `claude mcp add --header` are silently dropped. Instead of sending the configured `X-Helix-API-Key` header, Claude Code attempts OAuth 2.0 Dynamic Client Registration, hitting `/.well-known/oauth-protected-resource`, `/.well-known/oauth-authorization-server`, etc.

**Why it happens:** Claude Code's HTTP transport client has had regressions across multiple versions. The issue was supposedly fixed in v1.0.40, regressed by v1.0.85, was still broken in v1.0.108, and bug reports from December 2025 (issues #14977, #7290, #17069) confirm it persists. The issue #7290 was closed as "NOT_PLANNED" on February 20, 2026.

**Consequences:**
- The Helix MCP server returns 401 on every request
- Claude Code shows "Connected" status but all tool calls fail
- The server's OAuth endpoints (`/.well-known/oauth-protected-resource`) respond successfully, creating a confusing state where OAuth discovery works but actual auth fails because Helix uses API keys, not OAuth tokens
- The existing OAuth code in `helix-mcp` may actually be making things worse by responding to OAuth discovery requests

**Prevention:**
1. **Test with `claude mcp add --header` CLI approach first** -- the CLI approach may behave differently from manual `.mcp.json` editing
2. **Implement a fallback: also accept auth via query parameter** -- as a backup when headers are dropped, allow `?api_key=xxx` (less secure but functional)
3. **Remove all OAuth/`.well-known` endpoints** -- if Claude Code sees OAuth discovery responses, it may enter the OAuth flow instead of sending headers. Returning 404 on all `.well-known` paths forces Claude Code to fall back to plain header-based auth
4. **Test extensively with the current Claude Code version** at each phase -- this bug has regressed multiple times
5. **Document the exact `claude mcp add` command** the user should run, and verify it works

**Detection:** Run `claude mcp add` with headers, then check server logs for incoming requests. If you see `GET /.well-known/oauth-protected-resource` instead of `POST` with `X-Helix-API-Key`, the header bug is active.

**Sources:**
- [Claude Code issue #7290](https://github.com/anthropics/claude-code/issues/7290) -- HTTP/SSE Transport Ignores Authentication Headers (CLOSED/NOT_PLANNED)
- [Claude Code issue #14977](https://github.com/anthropics/claude-code/issues/14977) -- HTTP MCP server custom headers not being sent
- [Claude Code issue #17069](https://github.com/anthropics/claude-code/issues/17069) -- MCP header not added in ~/.claude.json

---

### Pitfall 2: Protocol Version Mismatch -- Server Says 2024-11-05, Client May Expect 2025-03-26

**What goes wrong:** The existing `helix-mcp` server responds to `initialize` with `protocolVersion: "2024-11-05"`. Claude Code may negotiate or expect the newer `2025-03-26` protocol, which introduces Streamable HTTP transport, JSON-RPC batching, and session management via `Mcp-Session-Id` headers.

**Why it happens:** The server was built for the original protocol spec. The MCP spec evolved significantly in March 2025 with the 2025-03-26 version and again in June 2025. Claude Code's MCP client implementation tracks the latest spec.

**Consequences:**
- Claude Code may reject the connection if it requires the newer protocol version
- Missing `Mcp-Session-Id` header handling may confuse stateful features
- Claude Code may send JSON-RPC batched requests that the current single-request parser cannot handle
- The server may not handle GET requests correctly for SSE stream initiation

**Prevention:**
1. **Check which protocol version Claude Code actually requests** in the `initialize` call's `protocolVersion` parameter
2. **Support both protocol versions** -- the spec allows version negotiation where the server returns the highest version it supports
3. **At minimum, parse and handle the `Mcp-Session-Id` header** if Claude Code sends one
4. **Handle JSON-RPC batch requests** (array of requests in a single POST body) even if you just process them sequentially

**Detection:** Look at Claude Code's `initialize` request to see what `protocolVersion` it sends. If the server responds with a version Claude Code does not support, initialization will fail.

**Sources:**
- [MCP Protocol Changelog 2025-03-26](https://modelcontextprotocol.io/specification/2025-03-26/changelog)
- [MCP Transports Specification](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports)

---

### Pitfall 3: OAuth Dead Code Actively Interferes with Authentication

**What goes wrong:** The existing `helix-mcp` has extensive OAuth 2.1 support code (RFC 9728 Protected Resource Metadata, Authorization Server Metadata proxy, `WWW-Authenticate` headers with `resource_metadata` hints). When Claude Code discovers these OAuth endpoints, it may enter the OAuth flow instead of using the API key. This is especially dangerous combined with Pitfall 1.

**Why it happens:** The OAuth code was added for Claude Web integration that never worked. It remains in the server, actively responding to OAuth discovery requests. Claude Code hits `GET /.well-known/oauth-protected-resource`, gets a valid response, and enters OAuth mode instead of sending the `X-Helix-API-Key` header.

**Consequences:**
- Claude Code enters an OAuth dance with Supabase Auth that will never complete successfully
- The `unauthorizedWithOAuthHint()` function returns `WWW-Authenticate: Bearer resource_metadata="..."` on 401, which tells Claude Code to use OAuth rather than retry with API key
- Authentication is permanently broken for Claude Code clients because they follow the OAuth hints

**Prevention:**
1. **Remove ALL OAuth-related code paths immediately** -- this is the highest priority fix
2. **Return plain 401 with a simple JSON error** on auth failure, no `WWW-Authenticate` header
3. **Return 404 on all `.well-known/*` GET requests** -- do not respond to OAuth discovery
4. **Remove the `getProtectedResourceMetadata()` function and the authorization server metadata proxy**

**Detection:** If server logs show `[OAUTH] Protected Resource Metadata request` when Claude Code connects, the OAuth code is interfering.

---

## Moderate Pitfalls

Issues that degrade the Claude Code experience, cause tools to work poorly, or produce confusing behavior.

---

### Pitfall 4: Tool Descriptions in Italian Confuse Claude's Tool Selection

**What goes wrong:** All tool descriptions and error messages in `helix-mcp` are in Italian (e.g., `"Elenca tutti i clienti del coach con i loro dati base"`, `"Errore: Cliente non trovato"`). Claude Code's model may not optimally route to tools with non-English descriptions, especially when the user is interacting in English.

**Why it happens:** The original developer wrote descriptions matching the app's Italian UI language. This is fine for human-readable docs but suboptimal for LLM tool selection.

**Consequences:**
- Claude may fail to select the right tool when the user asks in English
- Error messages like `"Errore: Cliente non trovato"` are less actionable for Claude to interpret and relay
- Tool descriptions consume context tokens less efficiently when they do not match the conversation language
- Field names like `nome`, `stato`, `palestra` in tool output require Claude to translate before presenting to the user

**Prevention:**
1. **Write all tool descriptions in English** -- this is the language Claude's tool-use training optimizes for
2. **Write error messages in English** -- Claude needs to understand them to provide useful error handling
3. **Use English field names in tool responses** -- `name` not `nome`, `status` not `stato`
4. **Keep the prompt templates in Italian if they target Italian-speaking coaches** -- prompts are user-facing content, tool descriptions are machine-facing

**Detection:** Ask Claude Code to "list all clients" and observe whether it selects the right tool. If it hesitates or fails, language mismatch is likely the cause.

**Sources:**
- [Anthropic Engineering: Writing effective tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents)

---

### Pitfall 5: Duplicate Read Tools and Resources Create Ambiguity

**What goes wrong:** The server exposes both MCP Resources (like `helix://clients`) AND read-only Tools (like `list_clients`) that return the same data. Claude Code cannot determine which mechanism to use, and the duplication wastes context tokens on redundant tool definitions.

**Why it happens:** The resources were built for the original MCP protocol. Read tools (marked `// ===== READ TOOLS (for Claude Web compatibility) =====`) were added later for Claude Web, which at the time may not have supported resources well. Now the server has 19 resources AND 7 read-only tools with overlapping functionality.

**Consequences:**
- 23 tools + 19 resources = massive context window consumption (Claude Code warns at 10,000 tokens)
- Claude may call a tool when reading a resource would suffice, or vice versa
- Inconsistent data: the `list_clients` tool returns `nome` field while the `helix://clients` resource returns `first_name`/`last_name` separately
- More tools = more confusion for the LLM about which to choose

**Prevention:**
1. **Decide: tools OR resources for read operations, not both** -- for Claude Code, tools are generally better because they are actively callable, while resources require @ mentions
2. **Remove the 7 read-only tools** (`list_clients`, `get_client`, `list_exercises`, `list_sessions`, `get_session`, `list_gyms`, `get_coach_summary`) and keep only the write tools + resources
3. **Or alternatively: remove resources entirely** and keep only tools (simpler, all data access through one mechanism)
4. **Ensure consistent field naming** across all responses regardless of mechanism chosen

**Detection:** Run `/mcp` in Claude Code and count total tools. If the list is overwhelming, there is redundancy to eliminate.

---

### Pitfall 6: Excessive Console Logging Creates Noise and Leaks Data

**What goes wrong:** The server has extensive `console.log` debugging throughout -- logging every request header, body content, authentication attempts, and user IDs. This creates massive log output that:
- Leaks sensitive data (API key lengths, user IDs, token prefixes) to Supabase function logs
- May slow down the function under load
- Makes real errors hard to find in production logs

**Why it happens:** Debug logging was added during OAuth troubleshooting and never removed.

**Consequences:**
- Security risk: token prefixes, user IDs, and API key metadata are logged
- Performance: string concatenation and `console.log` calls on every request add latency
- Log noise: 20+ log lines per request makes debugging actual issues harder
- Cost: Supabase may charge for excessive log volume

**Prevention:**
1. **Remove all debug console.log statements** except for actual error conditions
2. **Never log token/key values** even partially -- log `"API key authentication: success/failure"` not `"Token prefix: eyJ..."`
3. **Keep error logging** (`console.error`) for genuine failures
4. **Use structured logging** if you need request tracing: `console.error(JSON.stringify({ event: "auth_failed", method: req.method }))`

**Detection:** Check Supabase function logs after a few Claude Code interactions. If there are dozens of log lines per request, cleanup is needed.

---

### Pitfall 7: Tool Responses Lack `isError` Flag

**What goes wrong:** When tool execution fails (e.g., client not found, database error), the server returns a successful JSON-RPC response with error text in the content. It never sets `isError: true` in the tool result. This means Claude Code treats tool failures as successful operations with error-flavored text.

**Why it happens:** The original implementation returns `{ content: [{ type: "text", text: "Errore: ..." }] }` for errors, which is a valid MCP tool response. But without `isError: true`, Claude has no structured signal that the operation failed.

**Consequences:**
- Claude may try to use the "error" text as real data
- Claude cannot distinguish between "this operation failed, try a different approach" and "here is the result"
- Error recovery patterns do not trigger -- Claude may not retry or ask for corrected input
- Tool annotations (readOnlyHint, destructiveHint) are also missing, so Claude cannot gauge risk

**Prevention:**
1. **Return `isError: true` in all error responses:**
   ```typescript
   return { content: [{ type: "text", text: "Client not found" }], isError: true }
   ```
2. **Add tool annotations** to tool definitions to indicate which tools are read-only vs destructive:
   ```typescript
   annotations: { readOnlyHint: true }  // for list_clients
   annotations: { destructiveHint: true }  // for delete_session
   ```
3. **Write error messages that help Claude recover** -- not `"Errore: ${error.message}"` but `"Client with ID xxx not found. Use list_clients to find valid client IDs."`

**Detection:** Intentionally call a tool with invalid parameters and check if Claude Code recognizes it as a failure or tries to use the error text as data.

**Sources:**
- [MCP Error Handling Guide](https://mcpcat.io/guides/error-handling-custom-mcp-servers/)
- [MCP Error Codes Reference](https://www.mcpevals.io/blog/mcp-error-codes)

---

### Pitfall 8: Supabase Edge Function Statelessness vs MCP Session Expectations

**What goes wrong:** The MCP Streamable HTTP transport (2025-03-26) supports session management via `Mcp-Session-Id` headers. Supabase Edge Functions are stateless -- each request may hit a different worker with no shared memory. If the server tries to maintain in-memory session state, it will be lost between requests.

**Why it happens:** The `per_worker` policy in `config.toml` means each request gets its own isolated Deno worker. There is no way to share state between invocations except through the database.

**Consequences:**
- If the server assigns a session ID but cannot track it, subsequent requests with that session ID will fail validation
- Client state accumulated during a session (like conversation context) would be lost
- Claude Code may expect session continuity and behave oddly when it does not exist

**Prevention:**
1. **Do not implement MCP session management** -- the server should be fully stateless, treating each request independently
2. **Do not return `Mcp-Session-Id` in the initialize response** -- this tells Claude Code the server is sessionless, which is correct
3. **Authenticate each request independently** using the API key -- the current approach is correct for stateless operation
4. **If session state is ever needed, use the database** (e.g., a `mcp_sessions` table) rather than in-memory state

**Detection:** The current code does not implement sessions, which is correct. Verify it stays that way.

---

### Pitfall 9: Missing RLS Bypass with Service Role Key

**What goes wrong:** The current authentication code uses `SUPABASE_SERVICE_ROLE_KEY` to create the Supabase client after API key auth succeeds (line 88: `const supabase = createClient(supabaseUrl, supabaseServiceKey)`). This bypasses Row Level Security (RLS) entirely. All data for all users is accessible.

**Why it happens:** The API key auth flow cannot use the anon key with a user JWT (there is no JWT). So it uses the service role key, which has full database access. The code manually filters by `user_id` in queries, but this is defense-in-depth lost.

**Consequences:**
- A bug in any query filter (missing `.eq("user_id", userId)`) exposes other coaches' data
- New tools or resources added without the `user_id` filter will leak data
- The `update_session` and `delete_session` tools do NOT verify ownership -- they just filter by `session_id` without checking `user_id`

**Prevention:**
1. **Audit every query in every tool and resource handler** for proper `user_id` filtering
2. **The `update_session`, `delete_session`, and `complete_session` tools are vulnerable** -- they operate on `session_id` without verifying the session belongs to the authenticated user
3. **Consider using Supabase's `auth.uid()` impersonation** if possible, or at minimum add a helper function that wraps every query with `user_id` filtering
4. **Add ownership verification** to all write tools: fetch the record first, check `user_id`, then modify

**Detection:** Try calling `delete_session` with a session ID belonging to a different user. If it succeeds, the RLS bypass is exploitable.

---

### Pitfall 10: Large Tool Responses Exceed Token Limits

**What goes wrong:** Resources like `helix://exercises` return ALL exercises (default + custom) as a single JSON blob. Resources like `helix://sessions` return 50 sessions with full details. Claude Code warns when MCP tool output exceeds 10,000 tokens and has a default maximum of 25,000 tokens.

**Why it happens:** No pagination or result limiting on resource/tool responses. The queries fetch everything and serialize it all.

**Consequences:**
- Claude Code displays token warnings that confuse users
- Large responses consume significant context window space, reducing room for conversation
- Very large responses may be truncated, losing data
- Claude Code may refuse to use the tool again if it previously produced too-large output

**Prevention:**
1. **Add pagination to all list endpoints** -- accept `limit` and `offset` parameters
2. **Default to small result sets** (e.g., 20 items) with explicit pagination
3. **For the exercises list, return only IDs and names** in the summary, with details available per-exercise
4. **Include a `total_count` field** so Claude knows there are more results
5. **Consider setting `MAX_MCP_OUTPUT_TOKENS=50000`** in the Claude Code config as a safety net

**Detection:** Read `helix://exercises` and count the response size. If the exercise catalog grows beyond 50 items, this will become a problem.

**Sources:**
- [Claude Code MCP docs](https://code.claude.com/docs/en/mcp) -- "Claude Code will display a warning when MCP tool output exceeds 10,000 tokens"

---

## Minor Pitfalls

Issues that cause friction but do not break functionality.

---

### Pitfall 11: `new URL(uri)` Fails on Custom Scheme URIs

**What goes wrong:** In `readResource()`, the code does `const url = new URL(uri)` on URIs like `helix://clients/123`. The `URL` constructor handles this because `helix:` is parsed as a scheme, but `url.pathname` may not work as expected across all environments. The code then falls through to regex matching anyway, making the URL parsing dead code.

**Prevention:** Remove the `const url = new URL(uri)` and `const path = url.pathname` lines -- they are unused (all matching is done via regex). This avoids potential edge-case parsing issues.

---

### Pitfall 12: resources/list Returns uriTemplate as uri for Templated Resources

**What goes wrong:** In the `resources/list` handler (line 2192), the code maps `uri: r.uri || r.uriTemplate` -- this returns URI templates (like `helix://clients/{clientId}`) as if they were concrete URIs. Claude Code may try to read `helix://clients/{clientId}` literally.

**Why it happens:** MCP distinguishes between `resources/list` (concrete, readable URIs) and `resourceTemplates/list` (parameterized templates). The server conflates them.

**Prevention:**
1. **Separate resource templates from concrete resources** in the list response
2. **Implement `resourceTemplates/list`** for parameterized resources
3. **Only return concrete URIs** (like `helix://clients`, `helix://gyms`, `helix://exercises`, `helix://sessions`, `helix://sessions/planned`, `helix://coach/summary`, `helix://today`, `helix://group-templates`) in `resources/list`
4. **Return parameterized URIs** (like `helix://clients/{clientId}`) in `resourceTemplates/list`

---

### Pitfall 13: CORS Headers Are Unnecessary for Claude Code

**What goes wrong:** The server adds CORS headers (`Access-Control-Allow-Origin: *`) to every response and handles OPTIONS preflight requests. Claude Code uses HTTP transport (not browser-based), so CORS is irrelevant.

**Prevention:** CORS headers are harmless but add noise. Keep them only if the server might also be accessed from browser contexts. Remove the OPTIONS handler if Claude Code is the only client.

---

### Pitfall 14: `helix://today` Uses Server Timezone, Not Coach Timezone

**What goes wrong:** The `helix://today` resource and `daily-briefing` prompt use `new Date().toISOString().split("T")[0]` to determine "today." Supabase Edge Functions run in UTC. If a coach is in Italy (CET/CEST, UTC+1 or UTC+2), "today" may be wrong by a day.

**Prevention:**
1. **Accept a `timezone` parameter** in the daily-briefing prompt
2. **Or accept an explicit `date` parameter** and let Claude/user specify the date
3. **Document this limitation** so the coach knows to specify dates explicitly

---

### Pitfall 15: No Input Validation on Tool Parameters

**What goes wrong:** Tool handlers cast `args` directly to expected types without validation:
```typescript
const { client_id } = args as { client_id: string }
```
If Claude passes unexpected values (wrong type, missing field, UUID format violation), the error comes from Supabase as a cryptic database error rather than a clear validation message.

**Prevention:**
1. **Validate required parameters explicitly** before database calls
2. **Return clear, actionable errors** -- `"client_id is required and must be a valid UUID"` not the raw Postgres error
3. **Validate date format** (YYYY-MM-DD) for session_date parameters
4. **Validate enum values** for status fields

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation | Priority |
|-------------|---------------|------------|----------|
| OAuth removal | Pitfall 3: OAuth code interferes with auth | Remove ALL `.well-known` handlers and OAuth response code | P0 -- do first |
| Authentication testing | Pitfall 1: Claude Code header bugs | Test with exact Claude Code version, document working command | P0 -- blocks everything |
| Protocol compliance | Pitfall 2: Version mismatch | Check what Claude Code sends, respond appropriately | P1 |
| Tool cleanup | Pitfall 5: Duplicate tools/resources | Choose one mechanism, remove the other | P1 |
| Tool descriptions | Pitfall 4: Italian descriptions | Rewrite all in English | P1 |
| Error handling | Pitfall 7: Missing isError | Add `isError: true` to all error returns | P1 |
| Security audit | Pitfall 9: RLS bypass | Audit every write tool for ownership check | P1 |
| Response size | Pitfall 10: Token limit exceeded | Add pagination, limit defaults | P2 |
| Logging cleanup | Pitfall 6: Debug logging | Remove sensitive logs | P2 |
| Resource templates | Pitfall 12: URI vs template confusion | Implement resourceTemplates/list | P2 |
| Timezone | Pitfall 14: UTC vs local | Accept explicit dates | P3 |
| Input validation | Pitfall 15: No validation | Add parameter validation | P3 |
| URL parsing | Pitfall 11: Dead URL code | Remove unused code | P3 |
| CORS | Pitfall 13: Unnecessary CORS | Optional cleanup | P3 |

---

## Helix-Specific Code Issues Found During Research

These are concrete issues found in the existing `supabase/functions/helix-mcp/index.ts`:

### Security Issues (Current Code)

1. **`update_session` (line 1163-1188):** Updates session by `session_id` only -- no user ownership check. Any authenticated user could modify another user's session.

2. **`delete_session` (line 1190-1203):** Deletes by `session_id` only -- no ownership check. Same vulnerability.

3. **`complete_session` (line 1205-1218):** Marks complete by `session_id` only -- no ownership check.

4. **`update_session_exercise` (line 1342-1375):** Updates by `session_exercise_id` only -- no ownership check.

5. **`remove_session_exercise` (line 1377-1390):** Deletes by `session_exercise_id` only -- no ownership check.

6. **`reorder_session_exercises` (line 1392-1407):** Reorders by IDs only -- no session ownership check.

Note: RLS is disabled for this function (`verify_jwt = false`), and the service role key bypasses RLS. These tools are exploitable if an attacker obtains any valid API key.

### Functional Issues (Current Code)

7. **`list_sessions` tool (line 1015-1055):** Uses `query.eq("clients.user_id", userId)` on a non-inner join, which may return sessions without filtering properly (Supabase returns null clients instead of filtering them out). The resource version uses `clients!inner` correctly.

8. **`exercises/tags/{tag}` resource is declared in CLAUDE.md** but never implemented in the code -- no handler matches this URI pattern.

---

## Sources

- [Claude Code MCP Documentation](https://code.claude.com/docs/en/mcp)
- [MCP Specification 2025-03-26 Transports](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports)
- [MCP Build Server Guide](https://modelcontextprotocol.io/docs/develop/build-server)
- [Anthropic Engineering: Writing effective tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents)
- [Claude Code issue #7290: HTTP/SSE Transport Ignores Authentication Headers](https://github.com/anthropics/claude-code/issues/7290)
- [Claude Code issue #14977: HTTP MCP custom headers not sent](https://github.com/anthropics/claude-code/issues/14977)
- [Supabase Edge Functions Limits](https://supabase.com/docs/guides/functions/limits)
- [Supabase Deploy MCP Servers Guide](https://supabase.com/docs/guides/getting-started/byo-mcp)
- [MCP Error Handling Best Practices](https://mcpcat.io/guides/error-handling-custom-mcp-servers/)
- [MCP Error Codes Reference](https://www.mcpevals.io/blog/mcp-error-codes)
