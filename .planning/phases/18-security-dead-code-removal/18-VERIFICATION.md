---
phase: 18-security-dead-code-removal
verified: 2026-02-23T14:00:00Z
status: passed
score: 10/10 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Connect Claude Desktop using X-Helix-API-Key header"
    expected: "Claude Desktop connects successfully and can list resources/tools without being redirected to OAuth or receiving any 401/discovery response"
    why_human: "Cannot execute live MCP protocol exchange programmatically in this environment"
  - test: "Attempt to modify another coach's session via update_session MCP tool"
    expected: "Returns 'Session not found' without modifying the session or revealing it exists"
    why_human: "Requires two authenticated coach accounts and live MCP tool invocation to verify cross-coach access denial"
---

# Phase 18: Security & Dead Code Removal Verification Report

**Phase Goal:** Coach can authenticate reliably with API key and all write operations are secure against cross-user access
**Verified:** 2026-02-23T14:00:00Z
**Status:** passed
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths (Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | All OAuth 2.1 code is removed -- no `.well-known` endpoints, no Bearer token auth, no OAuth discovery responses | VERIFIED | `grep -in "oauth\|bearer\|well-known\|WWW-Authenticate\|authorization_server"` returns zero results in `supabase/functions/helix-mcp/index.ts`. `getProtectedResourceMetadata()` and `unauthorizedWithOAuthHint()` functions deleted. CORS headers contain only `x-helix-api-key` (not `authorization`), allowed methods are `POST, OPTIONS` only. |
| 2 | Claude Code connects with `X-Helix-API-Key` header without being redirected to OAuth flows | VERIFIED (automated) | `authenticateRequest()` handles ONLY the `X-Helix-API-Key` header path (lines 72-96). No Bearer token fallback exists. Auth failures return JSON-RPC error (code -32000) with setup hints, not redirects or WWW-Authenticate headers. `initialize` method works without any auth header. |
| 3 | A coach cannot modify another coach's sessions or exercises through any write tool | VERIFIED | All 8 write tools confirmed with ownership checks: `update_session` (1), `delete_session` (1), `complete_session` (1), `duplicate_session` (2 - source session + optional target client), `add_session_exercise` (1), `update_session_exercise` (1), `remove_session_exercise` (1), `reorder_session_exercises` (1). All use check-then-mutate pattern with inner join queries. |
| 4 | Unauthenticated requests receive a clear error response (not a redirect or discovery document) | VERIFIED | Missing key: returns `{"jsonrpc":"2.0","error":{"code":-32000,"message":"Missing X-Helix-API-Key header. Set X-Helix-API-Key header. Generate key in Helix Settings."}}` with HTTP 401. Invalid key: same structure with "Invalid API key." message. GET requests return 405 with JSON-RPC error. No redirects, no WWW-Authenticate, no discovery documents. |

**Score:** 4/4 success criteria verified

### Additional Must-Haves from Plans

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 5 | Frontend has no OAuth consent page or route | VERIFIED | `src/pages/OAuthConsent.tsx` deleted (confirmed with `test -f`). `src/App.tsx` has zero hits for `OAuthConsent` or `oauth/consent`. |
| 6 | Settings page has no Claude Web / OAuth section | VERIFIED | `grep -in "oauth\|claude web"` returns zero results in `src/pages/Settings.tsx`. Settings shows only API key section + Claude Desktop instructions. |
| 7 | CLAUDE.md documents API key auth only with no MCP OAuth references | VERIFIED | CLAUDE.md has only 3 `oauth` hits: "Google OAuth via Supabase" (login auth, not MCP), "Google OAuth Locale" section header, and README reference. All are Supabase Auth for user login - unrelated to MCP OAuth 2.1. Zero hits for "Bearer token", "oauth/consent", "RFC 9728", "WWW-Authenticate", "oauth-protected-resource". |
| 8 | `initialize` method works without authentication | VERIFIED | Lines 2447-2463: body parsed first, then `if (body.method === "initialize")` returns server info immediately without calling `authenticateRequest()`. |
| 9 | GET requests return 405 Method Not Allowed | VERIFIED | Lines 2416-2430: `if (req.method === "GET")` returns HTTP 405 with JSON-RPC error body and `Allow: POST, OPTIONS` header. |
| 10 | Ownership violations are logged with `[SECURITY]` prefix | VERIFIED | Lines 155, 179, 211: `console.warn("[SECURITY] Ownership violation: user=...")` in all three helper functions. |

**Overall Score:** 10/10 must-haves verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/pages/OAuthConsent.tsx` | DELETED - no longer exists | VERIFIED | File does not exist |
| `src/App.tsx` | Routes without /oauth/consent, no OAuthConsent import | VERIFIED | Zero grep hits for OAuth consent |
| `src/pages/Settings.tsx` | Settings without Claude Web section | VERIFIED | Only API key + Claude Desktop sections present |
| `CLAUDE.md` | Documentation with API key auth only | VERIFIED | X-Helix-API-Key documented, no MCP OAuth 2.1 references |
| `supabase/functions/helix-mcp/index.ts` | MCP server with API key-only auth, no OAuth code | VERIFIED | 2515 lines, zero OAuth references, 3 ownership helpers, 8 secured write tools |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/App.tsx` | `src/pages/OAuthConsent.tsx` | Route import removed | VERIFIED | Zero references to OAuthConsent in App.tsx |
| `helix-mcp/index.ts` authenticateRequest | API key path only | `X-Helix-API-Key` header | VERIFIED | Lines 72-96: only API key path, no Bearer token fallback |
| `helix-mcp/index.ts` main handler | initialize bypass | `method === "initialize"` check | VERIFIED | Lines 2447-2463: initialize bypasses auth |
| `verifySessionOwnership` | `sessions JOIN clients!inner` | Supabase inner join query | VERIFIED | Lines 143-147: `.select("id, client:clients!inner(user_id)")` |
| `verifySessionExerciseOwnership` | `session_exercises JOIN sessions!inner JOIN clients!inner` | Nested inner join | VERIFIED | Lines 167-171: `.select("id, session_id, session:sessions!inner(client:clients!inner(user_id))")` |
| `update_session` handler | `verifySessionOwnership` | check-then-mutate | VERIFIED | Line 1224: ownership check before `.update()` at line 1235 |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SEC-01 | 18-01-PLAN, 18-02-PLAN | OAuth 2.1 dead code removed (endpoints, Bearer auth, discovery) | SATISFIED | OAuthConsent.tsx deleted; App.tsx cleaned; Settings.tsx cleaned; CLAUDE.md cleaned; Edge Function: zero OAuth references, CORS headers stripped of `authorization` and `GET` |
| SEC-02 | 18-03-PLAN | Write tools verify coach ownership before executing mutations | SATISFIED | 8 write tools (exceeds the 6 named in REQUIREMENTS.md) verified with inner join ownership checks. verifySessionOwnership, verifySessionExerciseOwnership, verifyClientOwnership helpers implemented. |

**Note on SEC-02 scope:** REQUIREMENTS.md lists 6 tools (update_session, delete_session, complete_session, update_session_exercise, remove_session_exercise, reorder_session_exercises). The plan correctly identified 2 additional vulnerable tools (duplicate_session, add_session_exercise) and secured all 8. This exceeds the requirement.

**Orphaned requirements:** None. Only SEC-01 and SEC-02 are mapped to Phase 18 in REQUIREMENTS.md.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `supabase/functions/helix-mcp/index.ts` | multiple | Error messages in Italian (`Errore: ${error.message}`, `Sessione ${id} aggiornata con successo.`) | Info | Noted as pre-existing; Phase 20 plans English translation. Not a blocker. |

No blocker anti-patterns found. No TODO/FIXME/placeholder comments introduced. No stub implementations.

### Human Verification Required

#### 1. Live MCP Connection Test

**Test:** Configure Claude Desktop with the `X-Helix-API-Key` header pointing to the production Edge Function. Run `initialize`, then `resources/list`.
**Expected:** Receives `protocolVersion: "2024-11-05"` on initialize without any OAuth prompt. Lists 17+ resources. No redirect or discovery document returned.
**Why human:** Cannot execute live MCP protocol exchange from this verification environment.

#### 2. Cross-Coach Access Denial Test

**Test:** With two separate coach accounts, authenticate as Coach A and call `update_session` with the session ID of a session belonging to Coach B.
**Expected:** Returns `{"content":[{"type":"text","text":"Session not found"}]}` without modifying Coach B's data. Security warning logged in Edge Function logs.
**Why human:** Requires two live authenticated coach accounts and live MCP tool invocation to verify the denial actually blocks the mutation at the database level.

### Gaps Summary

No gaps found. All 10 must-have truths verified. All required artifacts exist and are substantive. All key links are wired. Requirements SEC-01 and SEC-02 are satisfied. No blocker anti-patterns detected.

The implementation is complete and correct:
- OAuth 2.1 code fully removed from frontend, Edge Function, and documentation
- API key authentication is the sole MCP auth method with clear error messages
- All write tools use check-then-mutate ownership verification with inner join queries that cannot be bypassed via SQL injection or partial matches
- Security violations are logged with structured context for auditing

---

_Verified: 2026-02-23T14:00:00Z_
_Verifier: Claude (gsd-verifier)_
