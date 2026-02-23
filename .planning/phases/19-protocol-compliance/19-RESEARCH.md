# Phase 19: Protocol Compliance - Research

**Researched:** 2026-02-23
**Domain:** MCP Streamable HTTP transport, JSON-RPC protocol compliance
**Confidence:** HIGH

## Summary

Phase 19 requires upgrading the Helix MCP server from protocol version `2024-11-05` to `2025-03-26`, implementing correct Streamable HTTP transport semantics. The changes are concentrated in a single file (`supabase/functions/helix-mcp/index.ts`) and involve three specific behaviors: version declaration, notification handling, and GET request handling.

The current code has three defects against the 2025-03-26 spec:
1. **Protocol version string** is `"2024-11-05"` in two places (initialize handler in `handleJsonRpc()` at line 2284 and the early-return `initialize` block at line 2454)
2. **`initialized` notification** is handled as a JSON-RPC request (with `id` and response body) instead of as a notification (no `id`, HTTP 202, no body). The spec method name is `"notifications/initialized"` not `"initialized"`.
3. **GET requests** already return 405, but the response could be more spec-compliant (the body format is not mandated by the spec, but the CORS headers and `Allow` header are correct).

All three changes are localized, low-risk, and require no new dependencies. The project decision to keep hand-rolled JSON-RPC (no MCP SDK) means changes are simple edits to the existing request handler.

**Primary recommendation:** Detect notifications (JSON-RPC messages without `id`) before parsing into the `handleJsonRpc()` function, return HTTP 202 with empty body. Update protocol version string in both initialize code paths. Keep existing GET 405 handling.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PROTO-01 | Server declares MCP protocol version `2025-03-26` | Two string literals to update: line 2284 (`handleJsonRpc` initialize case) and line 2454 (early-return initialize block). Spec confirms server MUST respond with a supported protocol version in the `protocolVersion` field. |
| PROTO-02 | Notifications (`initialized`) receive HTTP 202 response instead of JSON-RPC response | Spec requires: (1) notification method is `"notifications/initialized"`, (2) notifications have no `id` field, (3) server MUST return HTTP 202 Accepted with no body. Current code treats it as a request with `id` and returns JSON-RPC response. |
| PROTO-03 | GET requests receive clean 405 response, CORS headers correct for Streamable HTTP | Current code already returns HTTP 405 with `Allow: POST, OPTIONS` header and CORS headers. Spec says server MUST return 405 if not offering SSE stream on GET. Current implementation is nearly compliant; verify body is appropriate and CORS headers match. |
</phase_requirements>

## Standard Stack

### Core

No new libraries needed. The implementation uses the existing hand-rolled JSON-RPC handler in Deno.

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Hand-rolled JSON-RPC | N/A | MCP protocol handler | Project decision: keep 2,500 lines of business logic, no MCP SDK migration |
| Supabase Edge Functions | Deno runtime | Serverless deployment | Already in use, no change needed |

### Supporting

No supporting libraries needed for this phase.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled handler | MCP TypeScript SDK + `StreamableHttpTransport` | Would require rewriting entire server; explicitly out of scope per project decision |
| Hand-rolled handler | `mcp-lite` framework | Zero-dependency, Supabase-compatible, but still requires rewrite; out of scope |

## Architecture Patterns

### Pattern 1: Notification Detection at HTTP Level

**What:** Detect JSON-RPC notifications (messages without `id`) in the main `Deno.serve()` handler BEFORE dispatching to `handleJsonRpc()`. Notifications must return HTTP 202 with no body, not a JSON-RPC response.

**When to use:** For all notification messages (`notifications/initialized`, and any future `notifications/*`).

**Why at HTTP level:** The Streamable HTTP spec mandates HTTP 202 for notifications. The `handleJsonRpc()` function currently returns `JsonRpcResponse` objects, which always get wrapped in HTTP 200. Detecting notifications before entering that function is cleaner than retrofitting the function to sometimes return nothing.

**Example:**
```typescript
// In the main Deno.serve() handler, after parsing JSON body:
const body = JSON.parse(bodyText)

// Detect notification: JSON-RPC message without "id" field
// Per spec: "If the input consists solely of JSON-RPC responses or notifications,
// the server MUST return HTTP status code 202 Accepted with no body."
if (!("id" in body)) {
  // This is a notification (e.g., notifications/initialized)
  console.log("[RPC] Notification received:", body.method)
  return new Response(null, {
    status: 202,
    headers: corsHeaders,
  })
}

// Otherwise, it's a request with id - proceed to handleJsonRpc()
```

### Pattern 2: Protocol Version Update

**What:** Change the `protocolVersion` string from `"2024-11-05"` to `"2025-03-26"` in both initialize code paths.

**When to use:** In the initialize response.

**Why two places:** The current code has an early-return for `initialize` (before auth check, line 2448-2463) and a duplicate inside `handleJsonRpc()` (line 2278-2288). Both must be updated.

**Example:**
```typescript
// Before (in both locations):
protocolVersion: "2024-11-05",

// After (in both locations):
protocolVersion: "2025-03-26",
```

### Pattern 3: Notification Method Name Alignment

**What:** The spec uses `"notifications/initialized"` as the method name, not `"initialized"`. The current `case "initialized":` in `handleJsonRpc()` should be updated, though with Pattern 1 implemented, notifications will be caught at the HTTP level and never reach `handleJsonRpc()`.

**When to use:** As a defense-in-depth measure.

**Example:**
```typescript
// In handleJsonRpc, update the case (or remove it since notifications are handled at HTTP level)
case "notifications/initialized":
  return { jsonrpc: "2.0", id, result: {} }
```

### Anti-Patterns to Avoid

- **Returning JSON-RPC response for notifications:** The spec explicitly says notifications get HTTP 202 with no body. Returning `{ jsonrpc: "2.0", id: null, result: {} }` violates the spec.
- **Requiring auth for notifications/initialized:** The `initialized` notification is sent immediately after `initialize` completes. Since `initialize` is already handled without auth, the `initialized` notification should also not require auth (it contains no sensitive data).
- **Checking method name to detect notifications:** Use the absence of `id` field to detect notifications, not the method name. This is the canonical JSON-RPC 2.0 way and future-proofs for any notification type.
- **Adding session management (Mcp-Session-Id):** The spec says session management is optional ("MAY assign a session ID"). The project uses stateless serverless functions -- session management adds complexity for no benefit. Skip it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| N/A | N/A | N/A | This phase is pure protocol-level changes to an existing hand-rolled implementation. No new abstractions needed. |

**Key insight:** The changes are surgical string replacements and a small control flow addition. The hand-rolled approach is correct for this scope.

## Common Pitfalls

### Pitfall 1: Forgetting the Early-Return Initialize Block

**What goes wrong:** Only updating the `protocolVersion` in `handleJsonRpc()` but missing the early-return block at line 2448-2463 in `Deno.serve()`.
**Why it happens:** The initialize logic is duplicated -- once as an early return (before auth) and once inside the JSON-RPC dispatcher. The early-return path is the one Claude Code actually hits (since it runs before authentication).
**How to avoid:** Search for `"2024-11-05"` across the entire file and update ALL occurrences.
**Warning signs:** Claude Code still shows `2024-11-05` in connection logs even after updating `handleJsonRpc()`.

### Pitfall 2: Notification Auth Gate

**What goes wrong:** The `initialized` notification gets rejected by authentication because it's sent without the `Mcp-Session-Id` or before auth is established.
**Why it happens:** The current code requires authentication for everything except `initialize`. But `notifications/initialized` is sent as the very next message after `initialize`.
**How to avoid:** Handle notifications at the HTTP level before the authentication check, OR explicitly allow `notifications/initialized` through the auth gate.
**Warning signs:** Claude Code logs show 401 errors right after successful initialize.

### Pitfall 3: Confusing `"initialized"` with `"notifications/initialized"`

**What goes wrong:** Client sends `"notifications/initialized"` but server only handles `"initialized"`, so the notification falls through to "method not found" error.
**Why it happens:** The 2024-11-05 spec used `"initialized"` but 2025-03-26 uses `"notifications/initialized"`. Some clients may send either.
**How to avoid:** Detect notifications by absence of `id` field (Pattern 1), which catches ALL notifications regardless of method name. As a fallback, handle both method names.
**Warning signs:** JSON-RPC error responses appearing in Claude Code logs after initialization.

### Pitfall 4: Non-Empty 202 Response Body

**What goes wrong:** Returning `new Response("", { status: 202 })` instead of `new Response(null, { status: 202 })`.
**Why it happens:** Developer habit of using empty string instead of null for "no body".
**How to avoid:** Use `new Response(null, { status: 202, headers: corsHeaders })` explicitly.
**Warning signs:** Client receives unexpected body with 202, may reject or log warnings.

### Pitfall 5: JSON-RPC Batch Messages

**What goes wrong:** A batch message `[{...}, {...}]` is an array. The notification detection code checks `!("id" in body)` which would fail for arrays.
**Why it happens:** The spec allows batched requests and notifications.
**How to avoid:** Check `Array.isArray(body)` first. For batches, if ALL items lack `id`, return 202. If any have `id`, process as requests. For this project, batching is unlikely from Claude Code, but the code should not crash on arrays.
**Warning signs:** Server errors when client sends batched messages.

## Code Examples

### Current Code: What Needs to Change

**Location:** `/home/toto/scm-projects/helix/supabase/functions/helix-mcp/index.ts`

#### Change 1: Protocol Version (PROTO-01)

Two locations to update:

```typescript
// Line ~2284 (inside handleJsonRpc, initialize case):
// BEFORE:
protocolVersion: "2024-11-05",
// AFTER:
protocolVersion: "2025-03-26",

// Line ~2454 (early-return initialize block):
// BEFORE:
protocolVersion: "2024-11-05",
// AFTER:
protocolVersion: "2025-03-26",
```

#### Change 2: Notification Handling (PROTO-02)

Add notification detection in the main `Deno.serve()` handler, AFTER JSON parsing but BEFORE authentication:

```typescript
// Source: MCP Spec 2025-03-26 Streamable HTTP Transport
// "If the input consists solely of JSON-RPC responses or notifications,
//  the server MUST return HTTP status code 202 Accepted with no body."

const body = JSON.parse(bodyText)

// Detect JSON-RPC notification (no "id" field) or batch of notifications
const isNotification = !Array.isArray(body) && !("id" in body)
const isBatchNotification = Array.isArray(body) && body.every((msg: unknown) =>
  typeof msg === "object" && msg !== null && !("id" in msg)
)

if (isNotification || isBatchNotification) {
  console.log("[RPC] Notification received:", isNotification ? body.method : "batch")
  return new Response(null, {
    status: 202,
    headers: corsHeaders,
  })
}
```

Also update or remove the `case "initialized":` in `handleJsonRpc()`:
```typescript
// Update to match spec method name (defense in depth):
case "notifications/initialized":
  return { jsonrpc: "2.0", id, result: {} }
```

#### Change 3: GET Request 405 (PROTO-03)

Current code is already mostly compliant:

```typescript
// Current (already correct):
if (req.method === "GET") {
  return new Response(JSON.stringify({...}), {
    status: 405,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Allow": "POST, OPTIONS" }
  })
}
```

The spec says "return HTTP 405 Method Not Allowed" -- no specific body requirement. Current implementation returns a JSON-RPC error body which is informative but not required. The `Allow: POST, OPTIONS` header and CORS headers are correct. Consider whether to simplify the body or keep it for debugging.

### Verification with curl

```bash
# Test PROTO-01: Protocol version in initialize response
curl -s -X POST $MCP_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' \
  | jq '.result.protocolVersion'
# Expected: "2025-03-26"

# Test PROTO-02: Notification returns 202
curl -s -o /dev/null -w "%{http_code}" -X POST $MCP_URL \
  -H "Content-Type: application/json" \
  -H "X-Helix-API-Key: $API_KEY" \
  -d '{"jsonrpc":"2.0","method":"notifications/initialized"}'
# Expected: 202

# Test PROTO-02: Notification returns empty body
curl -s -X POST $MCP_URL \
  -H "Content-Type: application/json" \
  -H "X-Helix-API-Key: $API_KEY" \
  -d '{"jsonrpc":"2.0","method":"notifications/initialized"}'
# Expected: (empty)

# Test PROTO-03: GET returns 405
curl -s -o /dev/null -w "%{http_code}" $MCP_URL
# Expected: 405
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| HTTP+SSE transport (2024-11-05) | Streamable HTTP transport (2025-03-26) | March 2025 | New transport replaces old SSE model. Server can respond with `application/json` OR `text/event-stream`. |
| `"initialized"` method name | `"notifications/initialized"` method name | March 2025 | All notification methods now use `notifications/` prefix |
| JSON-RPC response for all messages | HTTP 202 for notifications/responses | March 2025 | Notifications and responses no longer get JSON-RPC response bodies |
| SSE endpoint for server-initiated messages | GET to MCP endpoint (optional SSE) | March 2025 | GET is now optional; servers that don't stream return 405 |

**Deprecated/outdated:**
- Protocol version `"2024-11-05"`: Deprecated, but clients should still negotiate gracefully
- HTTP+SSE transport: Replaced by Streamable HTTP; the old SSE endpoint pattern is no longer required
- `"initialized"` as method name: Replaced by `"notifications/initialized"`

**Not applicable to Helix (optional features we skip):**
- `Mcp-Session-Id` session management: Optional ("MAY"), not needed for stateless serverless
- SSE streaming in POST responses: Optional, we return `application/json` (simpler, sufficient)
- Resumability and redelivery: Optional, not applicable to stateless serverless
- JSON-RPC batching: Spec supports it but Claude Code does not send batches currently; handle gracefully without full implementation
- `Accept` header validation: Spec says client MUST send `Accept: application/json, text/event-stream`; server should tolerate missing header

## Open Questions

1. **Does Claude Code send `"notifications/initialized"` or `"initialized"`?**
   - What we know: The 2025-03-26 spec says `"notifications/initialized"`. Claude Code targets the latest spec.
   - What's unclear: Whether Claude Code sends the old or new method name (or both via backwards compat).
   - Recommendation: Detect notifications by absence of `id` field (handles both method names). The notification will be handled at HTTP level before method dispatch.

2. **Should `notifications/initialized` require authentication?**
   - What we know: The `initialized` notification is part of the initialization handshake, sent right after `initialize`. The `initialize` request itself does not require authentication. The notification contains no sensitive data.
   - What's unclear: Whether Claude Code sends the API key header with the notification.
   - Recommendation: Handle notifications before the auth check (same as `initialize`). The notification is functionally a protocol-level acknowledgment, not a data access request.

3. **Should the `"initialized"` case be removed from `handleJsonRpc()`?**
   - What we know: With notification detection at HTTP level, notifications never reach `handleJsonRpc()`.
   - Recommendation: Keep it as `case "notifications/initialized":` for defense in depth. If a notification somehow passes the HTTP-level check, it should not cause a "method not found" error.

## Sources

### Primary (HIGH confidence)
- MCP Specification 2025-03-26, Transports: https://modelcontextprotocol.io/specification/2025-03-26/basic/transports - Full Streamable HTTP transport specification (fetched and verified)
- MCP Specification 2025-03-26, Lifecycle: https://modelcontextprotocol.io/specification/2025-03-26/basic/lifecycle - Initialize/initialized lifecycle, method names, JSON examples (fetched and verified)
- JSON-RPC 2.0 Specification: https://www.jsonrpc.org/specification - Notification definition (no `id` field)

### Secondary (MEDIUM confidence)
- Claude Code MCP docs: https://code.claude.com/docs/en/mcp - Claude Code supports Streamable HTTP transport
- Supabase MCP guide: https://supabase.com/docs/guides/functions/examples/mcp-server-mcp-lite - Confirms Edge Functions work for MCP

### Tertiary (LOW confidence)
- None. All critical claims verified against official spec.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries, pure code changes to existing file
- Architecture: HIGH - Pattern verified against official MCP 2025-03-26 spec, JSON examples provided
- Pitfalls: HIGH - Based on code review of actual implementation + spec requirements

**Research date:** 2026-02-23
**Valid until:** 2026-04-23 (stable spec, already released)
