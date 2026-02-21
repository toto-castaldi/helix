# Architecture Patterns: MCP Server for Claude Code

**Domain:** MCP server architecture for Claude Code integration
**Researched:** 2026-02-21
**Confidence:** HIGH

## Current State Analysis

The existing `helix-mcp` Edge Function is a single 2500-line file implementing a custom JSON-RPC handler over HTTP POST. It works with Claude Desktop (API key in headers), but contains dead OAuth 2.1 code for Claude Web that never functioned correctly.

### What Works

- **API key authentication** via `X-Helix-API-Key` header (SHA-256 hashed, stored in `coach_ai_settings`)
- **JSON-RPC over POST**: Client sends JSON-RPC request, server returns JSON response
- **Tool/Resource/Prompt definitions and handlers**: 23 tools, 19 resources, 5 prompts all working
- **Supabase integration**: Service role client for data access, user isolation via userId

### What Needs Fixing

1. **Protocol version is outdated**: Reports `2024-11-05`, current is `2025-03-26` (with `2025-06-18` and `2025-11-25` also released)
2. **No Streamable HTTP compliance**: Does not send `Accept` headers, no SSE support, no `Mcp-Session-Id` handling
3. **Dead OAuth code**: ~140 lines of OAuth 2.1 / RFC 9728 code that never worked (`.well-known/oauth-protected-resource`, `.well-known/oauth-authorization-server`, `unauthorizedWithOAuthHint`)
4. **Bearer token fallback auth**: Two unused Bearer token auth paths that are dead code
5. **Excessive debug logging**: Every request logs all headers, body, etc.
6. **No `Accept` header handling**: Responses are always `application/json`, never SSE
7. **GET handler returns 405 for SSE**: Should return 405 per spec (this is actually correct for a stateless server), but the response format is wrong (JSON-RPC error body instead of simple 405)
8. **`initialized` notification returns a response**: Per spec, `initialized` is a notification (no `id`), server should return 202 Accepted with no body, not a JSON-RPC response

## Recommended Architecture

### Transport: Streamable HTTP (Stateless)

Use the **Streamable HTTP** transport as defined in MCP spec `2025-03-26`. Because Supabase Edge Functions are serverless (no persistent processes), use the **stateless** variant:

- Each HTTP POST creates a fresh handler context
- No session management (`Mcp-Session-Id` not issued)
- No SSE streaming (responses are single JSON objects)
- GET requests return 405 Method Not Allowed (no server-initiated streams)

This is the correct pattern for serverless deployments. Claude Code handles this gracefully -- when the server responds with `Content-Type: application/json` instead of opening an SSE stream, Claude Code processes the single JSON response directly.

**Confidence: HIGH** -- Supabase official docs recommend this exact pattern. The stateless reference implementation confirms it works on serverless platforms.

### Architecture: Two Approaches

#### Approach A: Refactor Current Custom Handler (RECOMMENDED)

Keep the existing custom JSON-RPC handler but fix protocol compliance:

```
Claude Code                    Supabase Edge Function
    |                               |
    |-- POST /helix-mcp ----------->|
    |   Content-Type: application/json
    |   Accept: application/json, text/event-stream
    |   X-Helix-API-Key: hx_...     |
    |                               |-- authenticate (API key hash lookup)
    |                               |-- parse JSON-RPC request
    |                               |-- route to handler
    |                               |-- execute (Supabase queries)
    |                               |
    |<-- 200 OK --------------------|
    |   Content-Type: application/json
    |   { jsonrpc: "2.0", id: N, result: ... }
```

**Why this approach**: The current code is well-structured and battle-tested. The business logic (23 tools, 19 resources, 5 prompts) is solid. The fixes needed are at the protocol layer, not the application layer. Introducing the MCP SDK would require rewriting all handlers to match SDK patterns, adding a dependency for no practical benefit.

#### Approach B: Migrate to MCP TypeScript SDK

Use `@modelcontextprotocol/sdk` with `WebStandardStreamableHTTPServerTransport`:

```typescript
import { McpServer } from 'npm:@modelcontextprotocol/sdk@1.25.3/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from 'npm:@modelcontextprotocol/sdk@1.25.3/server/webStandardStreamableHttp.js'
```

**Why NOT this approach**: Adds ~100KB+ dependency, requires rewriting all 23 tool registrations to match SDK's `registerTool()` API with Zod schemas, and the SDK's transport creates a fresh McpServer instance per request (same stateless pattern we already have). The benefit is automatic protocol compliance, but the cost is a full rewrite of working business logic.

### Recommendation: Approach A

Fix the existing handler for protocol compliance. The changes are surgical:

1. Update protocol version string
2. Fix notification handling (return 202 for `initialized`)
3. Handle `Accept` header properly
4. Return correct 405 for GET
5. Remove OAuth dead code
6. Clean up logging
7. Handle JSON-RPC batch arrays (even if just rejecting them cleanly)

## Component Boundaries

### Current (Monolith)

```
supabase/functions/helix-mcp/index.ts (2516 lines)
  - Types (lines 1-52)
  - Authentication (lines 54-130)
  - Helper Functions (lines 132-166)
  - MCP Protocol Constants (lines 168-206)
  - Resource Definitions (lines 184-206)
  - Tool Definitions (lines 208-522)
  - Prompt Definitions (lines 525-566)
  - Resource Handlers (lines 568-927)
  - Tool Handlers (lines 929-1799)
  - Prompt Handlers (lines 1801-2157)
  - JSON-RPC Router (lines 2159-2275)
  - OAuth Dead Code (lines 2278-2342)
  - Main HTTP Handler (lines 2344-2515)
```

### Recommended (Same file, cleaned up)

Supabase Edge Functions are single-file by convention (shared code goes in `_shared/`). Keep it as one file but reorganize:

```
supabase/functions/helix-mcp/index.ts (~2200 lines after cleanup)
  - Types & Constants
  - Authentication (API key only, ~30 lines)
  - Protocol Handler (initialize, notifications, method routing)
  - Resource Handlers
  - Tool Handlers
  - Prompt Handlers
  - HTTP Entry Point (POST handler, GET 405, CORS)
```

Remove:
- OAuth metadata endpoints (~60 lines)
- Bearer token auth paths (~30 lines)
- `unauthorizedWithOAuthHint` function (~25 lines)
- Excessive debug logging (~30 lines)

Total removal: ~145 lines of dead code.

## Data Flow

### Claude Code Configuration

Claude Code connects to the MCP server via this command:

```bash
claude mcp add --transport http helix \
  https://<project>.supabase.co/functions/v1/helix-mcp \
  --header "X-Helix-API-Key: hx_..."
```

This stores the configuration in `~/.claude.json`:

```json
{
  "mcpServers": {
    "helix": {
      "type": "http",
      "url": "https://<project>.supabase.co/functions/v1/helix-mcp",
      "headers": {
        "X-Helix-API-Key": "hx_..."
      }
    }
  }
}
```

Or in `.mcp.json` at project root (for team sharing):

```json
{
  "mcpServers": {
    "helix": {
      "type": "http",
      "url": "${HELIX_MCP_URL}",
      "headers": {
        "X-Helix-API-Key": "${HELIX_API_KEY}"
      }
    }
  }
}
```

### Request/Response Flow (Streamable HTTP Spec Compliant)

#### 1. Initialization

```
Claude Code -> POST /helix-mcp
  Content-Type: application/json
  Accept: application/json, text/event-stream
  X-Helix-API-Key: hx_...

  {"jsonrpc":"2.0","id":1,"method":"initialize","params":{
    "protocolVersion":"2025-03-26",
    "capabilities":{},
    "clientInfo":{"name":"claude-code","version":"1.0"}
  }}

Server -> 200 OK
  Content-Type: application/json

  {"jsonrpc":"2.0","id":1,"result":{
    "protocolVersion":"2025-03-26",
    "serverInfo":{"name":"helix-fitness-coach","version":"1.0.0"},
    "capabilities":{
      "resources":{"listChanged":false},
      "tools":{},
      "prompts":{"listChanged":false}
    }
  }}
```

Note: Server does NOT issue `Mcp-Session-Id` (stateless). This is valid per spec -- session management is optional.

#### 2. Initialized Notification

```
Claude Code -> POST /helix-mcp
  Content-Type: application/json
  Accept: application/json, text/event-stream
  X-Helix-API-Key: hx_...

  {"jsonrpc":"2.0","method":"initialized"}

Server -> 202 Accepted
  (no body)
```

**CRITICAL FIX**: Current code returns `{"jsonrpc":"2.0","id":null,"result":{}}` with 200. Per spec, notifications (no `id` field) get 202 Accepted with no body.

#### 3. Tool/Resource/Prompt Calls

```
Claude Code -> POST /helix-mcp
  Content-Type: application/json
  Accept: application/json, text/event-stream
  X-Helix-API-Key: hx_...

  {"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}

Server -> 200 OK
  Content-Type: application/json

  {"jsonrpc":"2.0","id":2,"result":{"tools":[...]}}
```

#### 4. GET Requests (Not Supported)

```
Claude Code -> GET /helix-mcp
  Accept: text/event-stream
  X-Helix-API-Key: hx_...

Server -> 405 Method Not Allowed
  (no body, or simple error)
```

Per spec: "The server MUST either return Content-Type: text/event-stream in response to this HTTP GET, or else return HTTP 405 Method Not Allowed, indicating that the server does not offer an SSE stream at this endpoint."

### Authentication Flow

```
Request arrives
  |
  v
Check X-Helix-API-Key header
  |
  +-- Present: Hash with SHA-256
  |     |
  |     v
  |   Query coach_ai_settings.helix_mcp_api_key_hash
  |     |
  |     +-- Match: Return { userId, supabase (service role client) }
  |     +-- No match: Return 401
  |
  +-- Absent: Return 401
```

**SIMPLIFICATION**: Remove Bearer token and OAuth paths entirely. Claude Code uses custom headers for auth with remote MCP servers. The `--header` flag in `claude mcp add` is the standard mechanism.

## Protocol Compliance Checklist

### MCP 2025-03-26 Streamable HTTP Requirements

| Requirement | Current Status | Fix Needed |
|-------------|---------------|------------|
| POST for JSON-RPC messages | YES | None |
| Client sends Accept: application/json, text/event-stream | Not checked | Validate but don't require (permissive) |
| Response Content-Type: application/json (for non-streaming) | YES | None |
| Notifications get 202 Accepted | NO (returns 200 with body) | Fix `initialized` handler |
| GET returns 405 or SSE stream | Partially (returns 405 but with JSON-RPC error body) | Simplify to clean 405 |
| Protocol version 2025-03-26 | NO (reports 2024-11-05) | Update string |
| Session ID optional | YES (not issued) | None |
| No embedded newlines in messages | YES | None |

### JSON-RPC Compliance

| Requirement | Current Status | Fix Needed |
|-------------|---------------|------------|
| Requests have id field | Handled | None |
| Notifications have no id field | Not distinguished | Detect and return 202 |
| Error codes follow spec | Mostly | Review error codes |
| Batch arrays | Not handled | Return -32600 Invalid Request for batches |

## Patterns to Follow

### Pattern 1: Notification Detection

Notifications in JSON-RPC are messages without an `id` field. The server must not return a JSON-RPC response for notifications.

```typescript
// Detect if message is a notification (no id field)
function isNotification(body: Record<string, unknown>): boolean {
  return !('id' in body)
}

// In main handler:
if (isNotification(body)) {
  // Process notification (e.g., "initialized")
  // Return 202 Accepted with no body
  return new Response(null, { status: 202, headers: corsHeaders })
}
```

**Confidence: HIGH** -- Directly from MCP spec and JSON-RPC 2.0 spec.

### Pattern 2: Clean Error Responses

```typescript
function jsonRpcError(id: string | number | null, code: number, message: string): Response {
  return new Response(JSON.stringify({
    jsonrpc: "2.0",
    id,
    error: { code, message }
  }), {
    status: 200,  // JSON-RPC errors use HTTP 200
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  })
}
```

Standard JSON-RPC error codes:
- `-32700`: Parse error
- `-32600`: Invalid Request
- `-32601`: Method not found
- `-32602`: Invalid params
- `-32000` to `-32099`: Server error (implementation-defined)

### Pattern 3: Minimal Authentication

```typescript
async function authenticate(req: Request): Promise<string | null> {
  const apiKey = req.headers.get("X-Helix-API-Key")
  if (!apiKey) return null

  const hash = await hashApiKey(apiKey)
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const client = createClient(supabaseUrl, serviceKey)

  const { data } = await client
    .from("coach_ai_settings")
    .select("user_id")
    .eq("helix_mcp_api_key_hash", hash)
    .single()

  return data?.user_id || null
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Returning Responses for Notifications

**What:** Current code returns `{ jsonrpc: "2.0", id: null, result: {} }` for `initialized`.
**Why bad:** Violates JSON-RPC spec. Notifications MUST NOT receive responses. MCP spec says notifications get HTTP 202.
**Instead:** Detect notifications by absence of `id` field, return 202 with no body.

### Anti-Pattern 2: OAuth Discovery Endpoints on MCP Server

**What:** Serving `.well-known/oauth-protected-resource` and `.well-known/oauth-authorization-server` from the Edge Function.
**Why bad:** These are dead code (Claude Web OAuth never worked), add complexity, confuse the request routing, and are not needed for Claude Code which uses header-based auth.
**Instead:** Remove entirely. If OAuth is ever needed again, implement it properly on the auth server, not the resource server.

### Anti-Pattern 3: Multiple Auth Fallback Chains

**What:** Try API key -> try Bearer with getUser -> try Bearer with header-based auth.
**Why bad:** Three auth paths means three potential failure modes, confusing logs, and security surface. Only one path is actually used (API key).
**Instead:** Single auth path: API key or 401. Period.

### Anti-Pattern 4: Verbose Debug Logging in Production

**What:** Every request logs all headers, body, auth attempts.
**Why bad:** Performance overhead, log noise, potential PII exposure (logging Bearer tokens even masked).
**Instead:** Log only errors and important state transitions. Use structured logging (JSON) if needed.

## Scalability Considerations

| Concern | Current (1 coach) | 10 coaches | 100 coaches |
|---------|-------------------|------------|-------------|
| Edge Function cold start | ~100ms | Same (isolated) | Same (isolated) |
| Auth lookup (per request) | 1 DB query | 1 DB query | 1 DB query |
| Tool execution | 1-5 DB queries | Same | Same |
| Concurrent requests | Supabase handles | Supabase handles | May need connection pooling |

The stateless architecture scales naturally with Supabase Edge Functions. No session state means no horizontal scaling concerns.

## Integration Points

### New Components: None

No new files, tables, or infrastructure needed. This is a refactor of an existing Edge Function.

### Modified Components

| Component | Changes |
|-----------|---------|
| `supabase/functions/helix-mcp/index.ts` | Protocol compliance fixes, OAuth removal, auth simplification, logging cleanup |
| `CLAUDE.md` | Update MCP section to reflect simplified auth, remove OAuth references |

### Unchanged Components

| Component | Why Unchanged |
|-----------|---------------|
| `coach_ai_settings` table | API key hash storage works correctly |
| Settings page (API key generation) | Works correctly |
| All tool handlers | Business logic is correct |
| All resource handlers | Business logic is correct |
| All prompt handlers | Business logic is correct |
| `supabase/config.toml` | `verify_jwt = false` is correct for custom auth |
| CI/CD pipeline | Edge Function deployment unchanged |

## Claude Code Connection Verification

After fixes, the connection should work with this test sequence:

```bash
# 1. Add the MCP server
claude mcp add --transport http helix \
  https://<project>.supabase.co/functions/v1/helix-mcp \
  --header "X-Helix-API-Key: hx_..."

# 2. Verify in Claude Code
> /mcp
# Should show "helix" as connected with tools/resources/prompts listed

# 3. Test a resource read
> @helix:helix://coach/summary

# 4. Test a tool call
> Use helix to list my clients

# 5. Test a prompt
> /mcp__helix__daily-briefing
```

## Sources

- [MCP Specification 2025-03-26: Transports](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports) -- HIGH confidence, authoritative spec
- [Claude Code MCP Documentation](https://code.claude.com/docs/en/mcp) -- HIGH confidence, official Anthropic docs
- [Supabase: Deploy MCP servers on Edge Functions](https://supabase.com/docs/guides/getting-started/byo-mcp) -- HIGH confidence, official Supabase docs
- [Supabase: MCP server with mcp-lite](https://supabase.com/docs/guides/functions/examples/mcp-server-mcp-lite) -- HIGH confidence, official Supabase example
- [Stateless MCP server reference](https://github.com/yigitkonur/example-mcp-server-streamable-http-stateless) -- MEDIUM confidence, community reference implementation
- [MCP Streamable HTTP deep dive](https://www.claudemcp.com/blog/mcp-streamable-http) -- MEDIUM confidence, community blog
- [Claude Code gains remote MCP support](https://www.infoq.com/news/2025/06/anthropic-claude-remote-mcp/) -- MEDIUM confidence, industry reporting
- [MCP Specification Changelog](https://modelcontextprotocol.io/specification/2025-11-25/changelog) -- HIGH confidence, authoritative changelog
