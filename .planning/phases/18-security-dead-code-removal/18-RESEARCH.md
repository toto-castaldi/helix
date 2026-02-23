# Phase 18: Security & Dead Code Removal - Research

**Researched:** 2026-02-23
**Domain:** MCP server security hardening, OAuth dead code removal
**Confidence:** HIGH

## Summary

Phase 18 is a focused cleanup and security hardening phase targeting a single Supabase Edge Function (`supabase/functions/helix-mcp/index.ts`, 2515 lines) and minor frontend removals. The work divides into two clear tracks: (1) removing all OAuth 2.1 dead code from both the Edge Function and the React frontend, and (2) adding ownership verification to write tools that currently perform mutations via the Supabase service role without checking whether the authenticated coach owns the target resource.

The codebase analysis reveals that 6 of 17 write tools already have ownership checks (e.g., `create_session`, `create_training_plan`, `update_group_template`, `delete_group_template`, `add_template_exercise`, `remove_template_exercise`, `apply_template_to_session`), while 6 tools are completely unprotected (`update_session`, `delete_session`, `complete_session`, `update_session_exercise`, `remove_session_exercise`, `reorder_session_exercises`). The `duplicate_session` tool also lacks ownership checks. Since the Edge Function uses the Supabase service role key (which bypasses RLS), these unprotected tools can modify any coach's data given a valid session/exercise ID.

**Primary recommendation:** Implement a shared `verifySessionOwnership(supabase, userId, sessionId)` helper that queries `sessions JOIN clients` to confirm ownership, returning the session if owned or null if not. All unprotected write tools call this before mutating. OAuth removal is straightforward deletion of ~150 lines from the Edge Function plus a frontend page and Settings section.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Return JSON-RPC error format for all auth failures (not HTTP-level errors)
- Specific error messages that reveal the reason: "Missing X-Helix-API-Key header", "Invalid API key", etc.
- Include setup hint in error message: "Set X-Helix-API-Key header. Generate key in Helix Settings."
- `initialize` method allowed without auth (clients can discover server info)
- All other methods require valid API key
- Return "not found" when a coach tries to access/modify another coach's resource -- do not reveal that the resource exists
- Log violations server-side as warnings (coach ID, resource ID, tool name) for monitoring potential abuse
- Verify ownership through parent session chain: exercise -> session -> client -> user_id
- Implement a shared helper function (e.g., `verifyOwnership(userId, resourceType, resourceId)`) used by all write tools for consistent behavior
- Keep service role for mutations (API key auth doesn't produce Supabase JWT) with manual ownership checks
- Full chain verification: session -> client -> user_id for session-level tools; exercise -> session -> client -> user_id for exercise-level tools
- Check-then-mutate pattern: first query verifies ownership, second query performs mutation (two round-trips, but enables violation logging and clear "not found" responses)
- Verify ownership on ALL operations including creates: before creating a session, verify client_id belongs to coach; before adding an exercise, verify session belongs to coach
- Remove ALL OAuth 2.1 code from Edge Function: Bearer token handling, `.well-known/oauth-protected-resource` endpoint, OAuth discovery responses
- Remove frontend `/oauth/consent` route and component entirely
- Remove any OAuth-related settings or mentions from frontend Settings page
- Update CLAUDE.md to remove all OAuth references (Claude Web section, consent page, OAuth secrets) -- keep only API key auth documentation

### Claude's Discretion
- Exact JSON-RPC error codes for different auth failure types
- Internal structure of the shared ownership helper (function signature, error types)
- How to structure the violation logging (console.warn vs structured logging)
- Whether to add ownership checks to read tools or only write tools (phase focuses on writes per success criteria)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SEC-01 | OAuth 2.1 dead code removed (endpoints, Bearer auth, discovery, ~150 lines) | OAuth code fully mapped: `authenticateRequest()` Bearer fallback (lines 94-129), `getProtectedResourceMetadata()` (lines 2281-2318), `unauthorizedWithOAuthHint()` (lines 2320-2342), GET `.well-known/*` handlers (lines 2379-2414), GET non-wellknown OAuth auth attempt (lines 2416-2462), frontend `OAuthConsent.tsx` page, `App.tsx` route, Settings Claude Web section (lines 172-189) |
| SEC-02 | Write tools verify coach ownership before executing mutations (6 tools: update_session, delete_session, complete_session, update_session_exercise, remove_session_exercise, reorder_session_exercises) | All 6 unprotected tools identified with exact line numbers. Ownership chain pattern already established by `create_session` (lines 1132-1141) and template tools. Shared helper pattern documented. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase JS | v2 (jsr:@supabase/supabase-js@2) | Database client | Already in use, service role client for MCP mutations |
| Deno | Edge Runtime | Edge Function runtime | Supabase standard |

### Supporting
No new libraries needed. This phase is pure refactoring of existing code.

### Alternatives Considered
None -- no new dependencies required.

## Architecture Patterns

### Recommended Project Structure
No structural changes. All work is within existing files:
```
supabase/functions/helix-mcp/index.ts    # Main target (~2515 lines)
src/pages/OAuthConsent.tsx                # Delete entirely
src/App.tsx                               # Remove OAuth route
src/pages/Settings.tsx                    # Remove Claude Web section
CLAUDE.md                                # Remove OAuth references
```

### Pattern 1: Shared Ownership Verification Helper
**What:** A reusable async function that verifies resource ownership through the parent chain before any mutation.
**When to use:** Before every write tool execution.
**Example:**
```typescript
// Two helper functions covering the two ownership chains

async function verifySessionOwnership(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string
): Promise<{ owned: boolean }> {
  const { data, error } = await supabase
    .from("sessions")
    .select("id, client:clients!inner(user_id)")
    .eq("id", sessionId)
    .single()

  if (error || !data) return { owned: false }
  const client = data.client as { user_id: string }
  if (client.user_id !== userId) {
    console.warn(`[SECURITY] Ownership violation: user=${userId} attempted to access session=${sessionId}`)
    return { owned: false }
  }
  return { owned: true }
}

async function verifySessionExerciseOwnership(
  supabase: SupabaseClient,
  userId: string,
  sessionExerciseId: string
): Promise<{ owned: boolean; sessionId?: string }> {
  const { data, error } = await supabase
    .from("session_exercises")
    .select("id, session_id, session:sessions!inner(client:clients!inner(user_id))")
    .eq("id", sessionExerciseId)
    .single()

  if (error || !data) return { owned: false }
  const session = data.session as { client: { user_id: string } }
  if (session.client.user_id !== userId) {
    console.warn(`[SECURITY] Ownership violation: user=${userId} attempted to access session_exercise=${sessionExerciseId}`)
    return { owned: false }
  }
  return { owned: true, sessionId: data.session_id }
}
```

### Pattern 2: Check-Then-Mutate for Write Tools
**What:** Every write tool first verifies ownership, then performs the mutation. Returns "not found" for violations.
**When to use:** All write tools in `executeTool()`.
**Example:**
```typescript
case "update_session": {
  const { session_id, ...updates } = args as { session_id: string; /* ... */ }

  // Step 1: Verify ownership
  const { owned } = await verifySessionOwnership(supabase, userId, session_id)
  if (!owned) {
    return { content: [{ type: "text", text: "Session not found" }] }
  }

  // Step 2: Perform mutation
  const { error } = await supabase
    .from("sessions")
    .update(updates)
    .eq("id", session_id)

  if (error) {
    return { content: [{ type: "text", text: `Error: ${error.message}` }] }
  }
  return { content: [{ type: "text", text: `Session ${session_id} updated.` }] }
}
```

### Pattern 3: Auth Error Response (JSON-RPC format)
**What:** Return JSON-RPC errors for authentication failures instead of HTTP-level errors or OAuth discovery.
**When to use:** When API key is missing or invalid.
**Example:**
```typescript
// Missing API key
if (!apiKey) {
  return new Response(JSON.stringify({
    jsonrpc: "2.0",
    id: null,
    error: {
      code: -32000,
      message: "Missing X-Helix-API-Key header. Set X-Helix-API-Key header. Generate key in Helix Settings."
    }
  }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  })
}

// Invalid API key
return new Response(JSON.stringify({
  jsonrpc: "2.0",
  id: null,
  error: {
    code: -32000,
    message: "Invalid API key. Generate a new key in Helix Settings."
  }
}), {
  status: 401,
  headers: { ...corsHeaders, "Content-Type": "application/json" }
})
```

### Anti-Patterns to Avoid
- **Silently succeeding on unauthorized access:** Supabase service role bypasses RLS. Without manual ownership checks, `update()` or `delete()` on a UUID that exists but belongs to another coach will succeed silently.
- **Returning HTTP 302/redirect for auth failures:** The user decided JSON-RPC error responses only. No redirects, no OAuth discovery documents.
- **Checking ownership after mutation:** Must check-then-mutate, not mutate-then-check. The check enables logging and prevents the mutation from happening at all.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Ownership verification | Ad-hoc `select` in each tool handler | Shared `verifySessionOwnership()` / `verifySessionExerciseOwnership()` helpers | Consistent behavior, single source of truth for the verification chain, easier to audit |

**Key insight:** The ownership chain is the same for all session-level tools (session -> client -> user_id) and for all exercise-level tools (session_exercise -> session -> client -> user_id). A shared helper prevents divergent implementations.

## Common Pitfalls

### Pitfall 1: Forgetting `duplicate_session` Ownership Check
**What goes wrong:** `duplicate_session` (line 1220) fetches the original session without ownership check, then creates a new one. A malicious coach could duplicate another coach's session data.
**Why it happens:** It's not in the SEC-02 requirement list of 6 tools, but it has the same vulnerability.
**How to avoid:** Include `duplicate_session` in the ownership hardening even though it's technically outside SEC-02's 6-tool list. The `new_client_id` parameter also needs ownership verification.
**Warning signs:** Any write tool that takes a `session_id` parameter and does not verify ownership.

### Pitfall 2: Service Role Bypasses RLS on All Tables
**What goes wrong:** The MCP server uses `SUPABASE_SERVICE_ROLE_KEY` which bypasses all RLS policies. The database-level RLS is irrelevant for this Edge Function.
**Why it happens:** API key auth doesn't produce a Supabase JWT, so the normal `anon` client with RLS wouldn't have access to any data. Service role is necessary.
**How to avoid:** Every data access must include `.eq("user_id", userId)` or an equivalent ownership join. The manual ownership checks replicate what RLS would do.
**Warning signs:** Any query that uses only a resource ID without filtering by the authenticated user.

### Pitfall 3: OAuth Removal Breaking Existing API Key Flow
**What goes wrong:** While removing OAuth code, accidentally altering the working API key authentication path.
**Why it happens:** The `authenticateRequest()` function has both paths interleaved.
**How to avoid:** Remove the Bearer token fallback (lines 94-129) carefully, keeping the API key path (lines 73-92) intact. Test with a valid API key immediately after removal.
**Warning signs:** `authenticateRequest()` returning null for valid API keys after refactoring.

### Pitfall 4: GET Request Handler Becoming a Dead Route
**What goes wrong:** After removing OAuth, the GET handler (lines 2416-2462) has no purpose but could still be called. If not properly handled, it could expose information or confuse clients.
**Why it happens:** The GET handler was for Claude Web SSE stream discovery and health checks.
**How to avoid:** Replace the entire GET handler section with a clean 405 "Method Not Allowed" response for all GET requests (except OPTIONS for CORS). This aligns with the MCP server being POST-only for JSON-RPC.
**Warning signs:** GET requests returning 200 or ambiguous responses after OAuth removal.

### Pitfall 5: `initialize` Method Must Work Without Auth
**What goes wrong:** If the `initialize` method requires authentication, MCP clients cannot discover server capabilities before sending credentials.
**Why it happens:** The user decided `initialize` should be allowed without auth.
**How to avoid:** In the main handler, parse the JSON-RPC body first. If the method is `initialize`, handle it before the authentication check. All other methods require auth.
**Warning signs:** Claude Desktop failing to connect even with a valid API key because the initialization handshake is blocked.

### Pitfall 6: Supabase Nested Join Syntax for Ownership Verification
**What goes wrong:** The Supabase JS client's nested `.select()` with `!inner` joins can behave unexpectedly. If the join fails (no matching client), the whole query returns null rather than the session without the client.
**Why it happens:** `!inner` makes it an INNER JOIN, which is exactly what we want for ownership checks.
**How to avoid:** Always use `!inner` for ownership joins. The pattern `sessions.select("id, client:clients!inner(user_id)").eq("id", sessionId)` returns null if the session doesn't exist OR if the join fails -- both cases mean "not found" to the caller. This is actually the desired behavior.
**Warning signs:** Queries returning data even when the joined client doesn't match the user.

## Code Examples

Verified patterns from the existing codebase:

### Existing Ownership Check (create_session, lines 1132-1141)
```typescript
// This pattern already exists and works correctly
const { data: client, error: clientErr } = await supabase
  .from("clients")
  .select("id")
  .eq("id", client_id)
  .eq("user_id", userId)
  .single()

if (clientErr || !client) {
  return { content: [{ type: "text", text: "Errore: Cliente non trovato o non autorizzato" }] }
}
```

### Existing Template Ownership Check (apply_template_to_session, lines 1722-1736)
```typescript
// Verify session exists and belongs to user (through client join)
const { data: session, error: sessionErr } = await supabase
  .from("sessions")
  .select("id, client:clients!inner(user_id)")
  .eq("id", session_id)
  .single()

if (sessionErr || !session) {
  return { content: [{ type: "text", text: "Errore: Sessione non trovata" }] }
}

const clientData = session.client as { user_id: string }
if (clientData.user_id !== userId) {
  return { content: [{ type: "text", text: "Errore: Non autorizzato per questa sessione" }] }
}
```

### Existing Exercise Ownership Check (remove_template_exercise, lines 1656-1669)
```typescript
// Verify ownership through template join
const { data: existing, error: checkErr } = await supabase
  .from("group_template_exercises")
  .select("id, template:group_templates!inner(user_id)")
  .eq("id", template_exercise_id)
  .single()

if (checkErr || !existing) {
  return { content: [{ type: "text", text: "Errore: Esercizio nel template non trovato" }] }
}

const templateData = existing.template as { user_id: string }
if (templateData.user_id !== userId) {
  return { content: [{ type: "text", text: "Errore: Non autorizzato" }] }
}
```

### Current OAuth Code to Remove (authenticateRequest, lines 94-129)
```typescript
// REMOVE: Bearer token fallback (lines 94-129)
// Fall back to Bearer token (Authorization header)
const authHeader = req.headers.get("Authorization")
// ... entire Bearer token handling block ...
```

### Current OAuth Endpoints to Remove
```
Lines 2277-2342: getProtectedResourceMetadata() + unauthorizedWithOAuthHint()
Lines 2379-2414: GET .well-known/* handlers
Lines 2416-2462: GET non-wellknown handler (OAuth-dependent)
```

### Files to Delete/Modify for Frontend OAuth Cleanup
```
DELETE: src/pages/OAuthConsent.tsx (312 lines)
MODIFY: src/App.tsx (remove line 13 import, lines 25-26 route)
MODIFY: src/pages/Settings.tsx (remove lines 172-189 "Claude Web" section)
```

## Inventory of Write Tools and Their Current Security Status

| Tool | Ownership Check | Action Needed |
|------|----------------|---------------|
| `create_session` | YES (client_id -> user_id) | None |
| `update_session` | NO | Add session ownership check |
| `delete_session` | NO | Add session ownership check |
| `complete_session` | NO | Add session ownership check |
| `duplicate_session` | NO | Add session ownership check (both source and target client) |
| `add_session_exercise` | NO | Add session ownership check |
| `update_session_exercise` | NO | Add exercise -> session -> client ownership check |
| `remove_session_exercise` | NO | Add exercise -> session -> client ownership check |
| `reorder_session_exercises` | NO | Add session ownership check |
| `create_training_plan` | YES (client_id -> user_id) | None |
| `create_group_template` | YES (inserts with user_id) | None |
| `update_group_template` | YES (template -> user_id) | None |
| `delete_group_template` | YES (template -> user_id) | None |
| `add_template_exercise` | YES (template -> user_id) | None |
| `remove_template_exercise` | YES (template_exercise -> template -> user_id) | None |
| `apply_template_to_session` | YES (template + session ownership) | None |

**Total needing ownership checks: 7** (the 6 from SEC-02 plus `add_session_exercise` which takes a `session_id` but has no ownership check, plus `duplicate_session` which takes `session_id` and optional `new_client_id`).

## Inventory of OAuth Code to Remove

### Edge Function (`supabase/functions/helix-mcp/index.ts`)
| Location | Description | Lines |
|----------|-------------|-------|
| `authenticateRequest()` lines 94-129 | Bearer token fallback (try OAuth token, try header-based auth) | ~36 lines |
| `getProtectedResourceMetadata()` lines 2281-2318 | RFC 9728 Protected Resource Metadata | ~38 lines |
| `unauthorizedWithOAuthHint()` lines 2320-2342 | 401 response with WWW-Authenticate header pointing to OAuth discovery | ~23 lines |
| Main handler lines 2379-2386 | GET `.well-known/oauth-protected-resource` handler | ~8 lines |
| Main handler lines 2391-2414 | GET `.well-known/oauth-authorization-server` proxy handler | ~24 lines |
| Main handler lines 2416-2462 | GET non-wellknown handler (authenticates via OAuth, SSE check, health check) | ~47 lines |
| Main handler lines 2476-2478 | `unauthorizedWithOAuthHint()` call on auth failure | ~3 lines |
| **Total Edge Function** | | **~179 lines** |

### Frontend
| File | Description | Lines |
|------|-------------|-------|
| `src/pages/OAuthConsent.tsx` | Entire file - OAuth consent page | 312 lines (delete) |
| `src/App.tsx` line 13 | Import of OAuthConsent | 1 line |
| `src/App.tsx` lines 25-26 | Route `/oauth/consent` | 2 lines |
| `src/pages/Settings.tsx` lines 172-189 | "Claude Web (claude.ai)" section | ~18 lines |
| **Total Frontend** | | **~333 lines** |

### Documentation
| File | Description |
|------|-------------|
| `CLAUDE.md` | OAuth 2.1 references: Claude Web section, consent page, OAuth secrets, Bearer token auth |

## JSON-RPC Error Code Recommendations

Based on the JSON-RPC 2.0 specification and MCP conventions:

| Scenario | Recommended Code | Message |
|----------|-----------------|---------|
| Missing API key | -32000 | "Missing X-Helix-API-Key header. Set X-Helix-API-Key header. Generate key in Helix Settings." |
| Invalid API key | -32000 | "Invalid API key. Generate a new key in Helix Settings." |
| Ownership violation | -32602 | "Session not found" / "Exercise not found" (don't reveal existence) |
| Method requires auth | -32000 | "Authentication required. Set X-Helix-API-Key header. Generate key in Helix Settings." |

**Rationale:** -32000 is the standard "Server error" code for implementation-specific errors (authentication falls in this category). Ownership violations use standard tool error responses (not JSON-RPC errors) since they happen inside tool execution.

Confidence: HIGH -- JSON-RPC 2.0 error codes are well-established and stable.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| OAuth 2.1 + API Key dual auth | API Key only | v1.6 decision | Simpler auth, removes dead code |
| Trust RLS for security | Manual ownership checks (service role bypasses RLS) | Phase 18 | Critical security fix |

**Deprecated/outdated:**
- OAuth 2.1 integration with Claude Web: Never worked reliably, Claude Code header bugs (#7290, #14977, #17069) made it impractical
- `ai-chat` Edge Function: Already deprecated in Milestone 12, replaced by MCP

## Open Questions

1. **Should `get_session` read tool also get the "not found" treatment?**
   - What we know: `get_session` (line 1057) already has an ownership check but returns "Non autorizzato" instead of "not found"
   - What's unclear: Whether to change this to "not found" for consistency
   - Recommendation: Update to return "not found" for consistency with the new write tool pattern, but this is Claude's discretion per CONTEXT.md

2. **What about `add_session_exercise` and `duplicate_session`?**
   - What we know: Both take `session_id` but lack ownership checks. They're not in the SEC-02 list of 6 tools but have the same vulnerability.
   - What's unclear: Whether to include them in Phase 18 scope
   - Recommendation: Include them -- they have the exact same vulnerability and the fix is the same pattern. Leaving them would be a known security hole.

3. **Should the `initialize` bypass be before or after body parsing?**
   - What we know: Currently, POST requests authenticate before parsing JSON-RPC body
   - What's unclear: The `initialize` method needs to work without auth, but we need to parse the body to know it's `initialize`
   - Recommendation: Parse body first, check if method is `initialize`, then either skip auth or proceed with auth. This requires restructuring the main handler flow.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `supabase/functions/helix-mcp/index.ts` (2515 lines, fully read)
- Codebase analysis: `src/pages/OAuthConsent.tsx` (312 lines, fully read)
- Codebase analysis: `src/pages/Settings.tsx` (200 lines, partially read)
- Codebase analysis: `src/App.tsx` (OAuth route lines)
- Codebase analysis: `supabase/migrations/00000000000000_initial_schema.sql` (RLS policies)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)

### Secondary (MEDIUM confidence)
- [MCP Error Codes](https://www.mcpevals.io/blog/mcp-error-codes) - confirmed MCP inherits JSON-RPC error codes

### Tertiary (LOW confidence)
None -- all findings based on direct codebase analysis.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new libraries, refactoring existing code
- Architecture: HIGH - ownership patterns already exist in codebase (template tools), just need to be applied consistently
- Pitfalls: HIGH - all identified from direct code analysis, not assumptions

**Research date:** 2026-02-23
**Valid until:** 2026-03-23 (stable -- no external dependency changes expected)
