# Phase 18: Security & Dead Code Removal - Context

**Gathered:** 2026-02-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Remove all OAuth 2.1 dead code from the MCP server and frontend, and add ownership verification to all write tools so a coach cannot modify another coach's data. The MCP server authenticates exclusively via `X-Helix-API-Key` header. No new capabilities — this is security hardening and cleanup of existing code.

</domain>

<decisions>
## Implementation Decisions

### Auth error responses
- Return JSON-RPC error format for all auth failures (not HTTP-level errors)
- Specific error messages that reveal the reason: "Missing X-Helix-API-Key header", "Invalid API key", etc.
- Include setup hint in error message: "Set X-Helix-API-Key header. Generate key in Helix Settings."
- `initialize` method allowed without auth (clients can discover server info)
- All other methods require valid API key

### Ownership violation behavior
- Return "not found" when a coach tries to access/modify another coach's resource — do not reveal that the resource exists
- Log violations server-side as warnings (coach ID, resource ID, tool name) for monitoring potential abuse
- Verify ownership through parent session chain: exercise -> session -> client -> user_id
- Implement a shared helper function (e.g., `verifyOwnership(userId, resourceType, resourceId)`) used by all write tools for consistent behavior

### OAuth removal scope
- Remove ALL OAuth 2.1 code from Edge Function: Bearer token handling, `.well-known/oauth-protected-resource` endpoint, OAuth discovery responses
- Remove frontend `/oauth/consent` route and component entirely
- Remove any OAuth-related settings or mentions from frontend Settings page
- Update CLAUDE.md to remove all OAuth references (Claude Web section, consent page, OAuth secrets) — keep only API key auth documentation

### Write tool security pattern
- Keep service role for mutations (API key auth doesn't produce Supabase JWT) with manual ownership checks
- Full chain verification: session -> client -> user_id for session-level tools; exercise -> session -> client -> user_id for exercise-level tools
- Check-then-mutate pattern: first query verifies ownership, second query performs mutation (two round-trips, but enables violation logging and clear "not found" responses)
- Verify ownership on ALL operations including creates: before creating a session, verify client_id belongs to coach; before adding an exercise, verify session belongs to coach

### Claude's Discretion
- Exact JSON-RPC error codes for different auth failure types
- Internal structure of the shared ownership helper (function signature, error types)
- How to structure the violation logging (console.warn vs structured logging)
- Whether to add ownership checks to read tools or only write tools (phase focuses on writes per success criteria)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for the implementation patterns. The key constraint is maintaining backward compatibility: existing API key auth flow must continue working throughout the refactor.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 18-security-dead-code-removal*
*Context gathered: 2026-02-23*
