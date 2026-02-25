---
phase: 18-security-dead-code-removal
plan: 02
subsystem: api
tags: [mcp, edge-function, auth, security, dead-code-removal]

# Dependency graph
requires:
  - phase: 12-mcp-server
    provides: "helix-mcp Edge Function with OAuth 2.1 + API key dual auth"
provides:
  - "MCP Edge Function with API key-only auth, zero OAuth code"
  - "initialize method accessible without authentication"
  - "GET requests return 405 Method Not Allowed"
  - "Specific JSON-RPC error messages with setup hints for auth failures"
affects: [18-security-dead-code-removal, mcp-server]

# Tech tracking
tech-stack:
  added: []
  patterns: ["API key-only auth for Edge Functions", "initialize bypass before auth check"]

key-files:
  created: []
  modified:
    - "supabase/functions/helix-mcp/index.ts"

key-decisions:
  - "Removed SUPABASE_ANON_KEY from authenticateRequest since only service role key needed for API key lookup"
  - "Removed authorization from CORS allowed headers since Bearer tokens no longer accepted"
  - "Removed GET from CORS allowed methods since all GET requests now return 405"

patterns-established:
  - "API key-only auth: X-Helix-API-Key header, SHA-256 hash lookup in coach_ai_settings"
  - "Initialize bypass: parse body first, check method, skip auth for initialize"
  - "Specific auth error messages: distinguish missing key vs invalid key with setup hints"

requirements-completed: [SEC-01]

# Metrics
duration: 3min
completed: 2026-02-23
---

# Phase 18 Plan 02: OAuth Dead Code Removal Summary

**Removed all OAuth 2.1 dead code (~141 lines) from helix-mcp Edge Function, simplified to API key-only auth with initialize bypass and specific error messages**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-23T13:34:17Z
- **Completed:** 2026-02-23T13:37:08Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Removed Bearer token authentication path from authenticateRequest() (~36 lines)
- Deleted getProtectedResourceMetadata() and unauthorizedWithOAuthHint() helper functions (~62 lines)
- Removed .well-known/oauth-protected-resource and .well-known/oauth-authorization-server endpoint handlers (~36 lines)
- Replaced complex GET handler (SSE, health check, OAuth flow) with clean 405 response
- Added initialize method bypass before auth check (no credentials needed for server discovery)
- Replaced generic OAuth error responses with specific JSON-RPC errors distinguishing missing vs invalid API key
- Cleaned up CORS headers and debug logging to remove all OAuth references

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove OAuth code from authenticateRequest and helper functions** - `417f4d8` (refactor)
2. **Task 2: Remove OAuth endpoints from main handler and add initialize bypass + GET 405** - `94098a2` (feat)

## Files Created/Modified
- `supabase/functions/helix-mcp/index.ts` - MCP Edge Function, now API key-only auth with no OAuth code

## Decisions Made
- Removed unused `SUPABASE_ANON_KEY` variable from authenticateRequest since the anon key was only used for Bearer token header-based auth which is now gone
- Removed `authorization` from CORS `Access-Control-Allow-Headers` since Bearer tokens are no longer accepted
- Removed `GET` from CORS `Access-Control-Allow-Methods` since all GET requests now return 405
- Auth error messages are specific: "Missing X-Helix-API-Key header..." vs "Invalid API key..." with setup hints

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused SUPABASE_ANON_KEY variable**
- **Found during:** Task 2 (main handler restructure)
- **Issue:** After removing Bearer token auth path, the `supabaseKey` variable (SUPABASE_ANON_KEY) in authenticateRequest was unused dead code
- **Fix:** Removed the variable declaration
- **Files modified:** supabase/functions/helix-mcp/index.ts
- **Verification:** grep confirms no SUPABASE_ANON_KEY references remain
- **Committed in:** 94098a2 (Task 2 commit)

**2. [Rule 2 - Missing Critical] Cleaned CORS headers to match new auth model**
- **Found during:** Task 2 (OAuth endpoint removal)
- **Issue:** CORS headers still advertised `authorization` in allowed headers and `GET` in allowed methods, which would mislead clients into thinking Bearer auth and GET requests work
- **Fix:** Removed `authorization` from Access-Control-Allow-Headers, removed `GET` from Access-Control-Allow-Methods
- **Files modified:** supabase/functions/helix-mcp/index.ts
- **Verification:** grep confirms no authorization references remain in the file
- **Committed in:** 94098a2 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical)
**Impact on plan:** Both auto-fixes necessary for correctness. Unused variables and misleading CORS headers are dead code / incorrect behavior after OAuth removal. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- OAuth code fully removed from Edge Function
- Ready for Phase 18 Plan 03 (frontend OAuth code removal / CLAUDE.md cleanup)
- MCP server continues to work with API key auth via X-Helix-API-Key header

## Self-Check: PASSED

- FOUND: supabase/functions/helix-mcp/index.ts
- FOUND: 417f4d8 (Task 1 commit)
- FOUND: 94098a2 (Task 2 commit)
- FOUND: 18-02-SUMMARY.md

---
*Phase: 18-security-dead-code-removal*
*Completed: 2026-02-23*
