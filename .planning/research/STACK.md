# Technology Stack: MCP Server Assessment & Fix for Claude Code

**Project:** Helix v1.6 - MCP Assessment & Fix
**Researched:** 2026-02-21
**Overall Confidence:** HIGH

## Executive Summary

The existing Helix MCP server is a hand-rolled JSON-RPC implementation running on a Supabase Edge Function (Deno runtime). It advertises protocol version `2024-11-05` and uses a simple POST-based JSON-RPC transport with API key authentication. This works with Claude Code today because Claude Code is backward-compatible, but the server is two spec revisions behind and misses protocol features that would improve reliability and developer experience.

The recommended approach is: **keep the hand-rolled JSON-RPC implementation** but upgrade it to be compliant with the Streamable HTTP transport spec and protocol version `2025-03-26`. Do NOT adopt the official MCP TypeScript SDK or mcp-lite, because the server is already 2,500 lines of working business logic and a framework migration would be high-risk with low reward.

## Current State Analysis

### What Exists

| Component | Current | Status |
|-----------|---------|--------|
| Protocol version | `2024-11-05` | Two revisions behind (current: `2025-06-18`) |
| Transport | Custom POST-only JSON-RPC | Works but not spec-compliant Streamable HTTP |
| Auth (API Key) | `X-Helix-API-Key` with SHA-256 hash lookup | Working, keep this |
| Auth (OAuth 2.1) | RFC 9728 metadata + Bearer token fallback | Dead code, never worked with Claude Web |
| Auth (Bearer fallback) | Multiple getUser() attempts | Unnecessary complexity |
| GET handling | Returns 405 for SSE, health check otherwise | Partially correct per spec |
| Session management | None | Not required for stateless server |
| Capabilities | `resources`, `tools`, `prompts` | Correct, needs `listChanged` review |
| Tools | 23 tools | Need audit for correctness |
| Resources | 19 resources | Need audit for correctness |
| Prompts | 5 prompts | Need audit for correctness |

### What Claude Code Sends

When configured with `claude mcp add --transport http helix <URL> --header "X-Helix-API-Key: <key>"`, Claude Code:

1. POSTs an `initialize` request with `Accept: application/json, text/event-stream`
2. Expects either `Content-Type: application/json` (simple response) or `Content-Type: text/event-stream` (SSE stream)
3. Sends `initialized` notification (expects `202 Accepted`)
4. POSTs `tools/list`, `resources/list`, `prompts/list` requests
5. POSTs `tools/call`, `resources/read`, `prompts/get` during operation
6. May include `Mcp-Session-Id` header if server provides one
7. May include `MCP-Protocol-Version` header on subsequent requests (spec `2025-06-18` requirement)

**Confidence:** HIGH - Based on official Claude Code docs and MCP specification.

## Recommended Stack (Changes Needed)

### Protocol Layer (Upgrade Required)

| Item | Current | Recommended | Why |
|------|---------|-------------|-----|
| Protocol version | `2024-11-05` | `2025-03-26` | Adds tool annotations, JSON-RPC batching, Streamable HTTP; Claude Code supports this; avoids `2025-06-18` which removes batching and adds complexity (elicitation, structured outputs) not needed here |
| Transport | POST-only, custom routing | Streamable HTTP (POST returns JSON, GET returns 405) | Spec-compliant; the server does not need SSE streaming so `enableJsonResponse: true` equivalent behavior is correct |
| Notification handling | Returns `{ result: {} }` for `initialized` | Return `202 Accepted` with no body | Per Streamable HTTP spec, notifications get 202 |
| Error responses | Always 200 with JSON-RPC error | 401 for auth failures, 200 for JSON-RPC errors | HTTP status codes should reflect transport-level errors |

**Confidence:** HIGH - Verified against MCP specification `2025-03-26` and `2025-06-18` transport docs.

### Authentication (Simplify)

| Item | Current | Recommended | Why |
|------|---------|-------------|-----|
| API Key auth | `X-Helix-API-Key` header | Keep as-is | Working, simple, Claude Code supports custom headers |
| OAuth 2.1 code | RFC 9728 metadata, Bearer token fallback, proxy endpoints | **Remove entirely** | Dead code. Claude Web OAuth never worked. Claude Code uses header-based auth. No users depend on this. |
| Bearer token fallback | Multiple `getUser()` attempts | **Remove entirely** | Only needed for OAuth flow which is being removed |
| Auth response | 401 with OAuth hint in `WWW-Authenticate` | Simple 401 with JSON-RPC error | No OAuth discovery needed |

**Confidence:** HIGH - Project goal explicitly states removing OAuth/Claude Web dead code.

### Tool Annotations (Add)

| Item | Current | Recommended | Why |
|------|---------|-------------|-----|
| Tool annotations | None | Add `readOnlyHint`, `destructiveHint`, `idempotentHint` | Spec `2025-03-26` feature; helps Claude Code understand which tools are safe to auto-approve |
| Read-only tools | Not annotated | `{ readOnlyHint: true }` for all query/list tools | Claude Code can auto-approve read operations |
| Mutating tools | Not annotated | `{ readOnlyHint: false, destructiveHint: false }` for create/update | Signals Claude Code to confirm before executing |
| Delete tools | Not annotated | `{ readOnlyHint: false, destructiveHint: true }` | Signals Claude Code to always confirm |

**Confidence:** HIGH - Tool annotations are part of the `2025-03-26` spec, verified in official docs.

### Infrastructure (No Change)

| Technology | Version | Purpose | Why Keep |
|------------|---------|---------|----------|
| Supabase Edge Functions | Current | Server runtime (Deno) | Already deployed, working |
| `@supabase/supabase-js` | v2 (JSR) | Database access | Already used, works with RLS |
| Deno runtime | Current (via Supabase) | JavaScript/TypeScript execution | No choice, Edge Functions require it |
| `verify_jwt = false` | In `config.toml` | Custom auth instead of Supabase JWT | Correct for API key auth |

**Confidence:** HIGH - No infrastructure changes needed.

## Key Decision: SDK vs Hand-Rolled

### Decision: Keep Hand-Rolled Implementation

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **Keep hand-rolled** (recommended) | No migration risk; 2,500 LOC of working business logic untouched; only transport layer needs updating | Must manually handle protocol compliance | **RECOMMENDED** |
| Official MCP SDK (`@modelcontextprotocol/sdk` v1.27.0) | `WebStandardStreamableHTTPServerTransport` works on Deno; spec-compliant transport | Massive refactor of 2,500 LOC; SDK is 1.x (v2 pre-alpha in progress); dependency on npm package in Deno JSR environment; risk of introducing bugs | Rejected |
| mcp-lite (v0.10.0) | Lightweight, Deno-native, Supabase Edge Functions starter | Still requires full refactor; less mature (v0.x); adds dependency | Rejected |

**Rationale:** The server already handles JSON-RPC correctly. The transport layer (HTTP routing, headers, status codes) is ~100 lines that need updating. The business logic (tools, resources, prompts, queries) is ~2,400 lines that work correctly. Adopting an SDK means rewriting all 2,500 lines for no functional gain.

**What needs to change in the hand-rolled code:**
1. Protocol version: `2024-11-05` -> `2025-03-26`
2. Notifications return 202 instead of JSON-RPC response
3. Remove OAuth endpoints and code (~150 lines)
4. Remove excessive debug logging (~50 lines)
5. Add tool annotations to all tool definitions
6. Add `Accept` header validation on POST requests
7. GET requests return 405 (no SSE needed for this server)
8. Handle `MCP-Protocol-Version` header (for forward compat with `2025-06-18` clients)

**Confidence:** HIGH - Low-risk incremental changes to existing working code.

## Protocol Version Strategy

### Why `2025-03-26` and Not `2025-06-18`

| Feature | `2025-03-26` | `2025-06-18` | Helix Needs It? |
|---------|--------------|--------------|-----------------|
| Streamable HTTP transport | Yes | Yes | Yes (basic POST/JSON mode) |
| Tool annotations | Yes | Yes | Yes |
| JSON-RPC batching | Yes | **Removed** | No |
| Structured tool output | No | Yes | No (text responses sufficient) |
| Elicitation | No | Yes | No (no user interaction needed) |
| Resource links in tool results | No | Yes | No |
| `MCP-Protocol-Version` header required | No | Yes | Not yet (handle gracefully) |
| `title` field on tools/resources | No | Yes | Nice-to-have, can add later |

**Strategy:** Advertise `2025-03-26` in the `initialize` response. Handle the `MCP-Protocol-Version` header gracefully (accept it if present, don't require it). This gives maximum compatibility with Claude Code while avoiding unnecessary complexity.

**Forward compatibility:** When Claude Code starts sending `2025-06-18` in `initialize`, our server responds with `2025-03-26` (the latest it supports). Per the spec, this is valid -- the client can either accept or disconnect. Claude Code will accept because it's backward-compatible.

**Confidence:** HIGH - Version negotiation behavior verified in MCP lifecycle specification.

## Claude Code Integration Details

### Configuration Command

```bash
claude mcp add --transport http helix \
  https://<project-ref>.supabase.co/functions/v1/helix-mcp \
  --header "X-Helix-API-Key: <api-key>"
```

### Alternative: JSON Configuration

```json
{
  "mcpServers": {
    "helix": {
      "type": "http",
      "url": "https://<project-ref>.supabase.co/functions/v1/helix-mcp",
      "headers": {
        "X-Helix-API-Key": "<api-key>"
      }
    }
  }
}
```

### Configuration Scopes

| Scope | File | When to Use |
|-------|------|-------------|
| `local` (default) | `~/.claude.json` | Personal dev/production key |
| `project` | `.mcp.json` in repo root | Shared team config (URL only, not key) |
| `user` | `~/.claude.json` | Cross-project personal config |

### Claude Code-Specific Behaviors to Handle

| Behavior | How to Handle |
|----------|---------------|
| Tool output > 10,000 tokens triggers warning | Keep resource/tool responses concise; paginate if needed |
| `MAX_MCP_OUTPUT_TOKENS` default 25,000 | Client card markdown should stay under this |
| MCP timeout (default 2 min, configurable via `MCP_TIMEOUT`) | Supabase Edge Functions have 60s timeout; should be fine |
| Tool Search (auto when tools > 10% of context) | 23 tools may trigger this; add good `description` fields |
| `/mcp` command shows server status | Server should respond to health checks |
| `@helix:` resource references | Resources are browsable via @ mentions |

**Confidence:** HIGH - Verified against Claude Code official documentation.

## CORS Headers (Update Required)

### Current

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-helix-api-key",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
}
```

### Recommended

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-helix-api-key, mcp-session-id, mcp-protocol-version, accept",
  "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
  "Access-Control-Expose-Headers": "mcp-session-id, mcp-protocol-version",
}
```

**Changes:**
- Remove `authorization`, `x-client-info`, `apikey` (OAuth dead code cleanup)
- Add `mcp-session-id`, `mcp-protocol-version`, `accept` (Streamable HTTP spec)
- Add `DELETE` method (session termination, can return 405)
- Add `Access-Control-Expose-Headers` for response headers client needs to read

**Confidence:** HIGH - Headers derived from MCP Streamable HTTP specification.

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Implementation | Hand-rolled JSON-RPC | Official MCP SDK v1.27.0 | 2,500 LOC refactor risk; SDK v2 imminent |
| Implementation | Hand-rolled JSON-RPC | mcp-lite v0.10.0 | v0.x maturity; still requires full refactor |
| Protocol version | `2025-03-26` | `2025-06-18` | Adds complexity (elicitation, structured output) without benefit |
| Protocol version | `2025-03-26` | `2024-11-05` (keep current) | Misses tool annotations; not Streamable HTTP compliant |
| Auth | API Key only | Keep OAuth + API Key | OAuth never worked; dead code adds confusion |
| Transport | JSON response mode | Full SSE streaming | Server has no server-initiated messages; JSON mode is simpler and correct |
| Session management | Stateless | Stateful with `Mcp-Session-Id` | No server-side state to track; Edge Functions are ephemeral |

## What NOT to Do

1. **Do NOT adopt the MCP TypeScript SDK.** The server works. The SDK would require rewriting all business logic into the SDK's registration patterns. The SDK is also transitioning from v1 to v2.

2. **Do NOT implement SSE streaming.** The server has no server-initiated messages (no long-running tools, no progress updates, no notifications). Every request gets a single JSON response. Returning `Content-Type: application/json` is explicitly allowed by the Streamable HTTP spec.

3. **Do NOT implement session management.** Supabase Edge Functions are stateless (each request may hit a different worker). The `Mcp-Session-Id` is optional per spec. Stateless mode is correct for this architecture.

4. **Do NOT implement JSON-RPC batching.** Added in `2025-03-26` but removed in `2025-06-18`. Not worth implementing a feature that's already deprecated.

5. **Do NOT keep OAuth code "just in case."** It was built for Claude Web integration that never worked. If OAuth is needed later, it should be rebuilt from scratch following the current spec, not patched from broken code.

## Sources

### Official Specifications (HIGH confidence)
- [MCP Specification 2025-03-26 Changelog](https://modelcontextprotocol.io/specification/2025-03-26/changelog) - Breaking changes from 2024-11-05
- [MCP Specification 2025-06-18 Changelog](https://modelcontextprotocol.io/specification/2025-06-18/changelog) - Changes from 2025-03-26
- [MCP Streamable HTTP Transport (2025-06-18)](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports) - Transport requirements, session management, backwards compatibility
- [MCP Lifecycle & Version Negotiation](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle) - Protocol version negotiation behavior

### Claude Code Documentation (HIGH confidence)
- [Claude Code MCP Documentation](https://code.claude.com/docs/en/mcp) - Transport types, configuration, auth, headers, scopes, tool search

### SDK References (MEDIUM confidence)
- [MCP TypeScript SDK GitHub](https://github.com/modelcontextprotocol/typescript-sdk) - v1.27.0 (2026-02-16); v2 pre-alpha in progress
- [MCP TypeScript SDK npm](https://www.npmjs.com/package/@modelcontextprotocol/sdk) - `WebStandardStreamableHTTPServerTransport` available for Deno
- [mcp-lite npm](https://www.npmjs.com/package/mcp-lite) - v0.10.0, lightweight alternative

### Supabase MCP Integration (MEDIUM confidence)
- [Supabase Deploy MCP Servers](https://supabase.com/docs/guides/getting-started/byo-mcp) - Official guide for MCP on Edge Functions
- [Supabase mcp-lite Example](https://supabase.com/docs/guides/functions/examples/mcp-server-mcp-lite) - Hono + mcp-lite pattern on Edge Functions

### Community & Analysis (LOW confidence)
- [Why MCP Deprecated SSE](https://blog.fka.dev/blog/2025-06-06-why-mcp-deprecated-sse-and-go-with-streamable-http/) - Background on transport evolution
- [Claude Code Remote MCP Support](https://www.infoq.com/news/2025/06/anthropic-claude-remote-mcp/) - Claude Code streamable HTTP support announcement
