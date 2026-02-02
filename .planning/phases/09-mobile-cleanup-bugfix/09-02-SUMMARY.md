---
phase: 09-mobile-cleanup-bugfix
plan: 02
subsystem: auth
tags: [supabase, jwt, edge-functions, auth, bugfix]

# Dependency graph
requires:
  - phase: edge-functions
    provides: client-export Edge Function
provides:
  - Fixed client export with proper JWT token refresh
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Use refreshSession() instead of getSession() for authenticated Edge Function calls"

key-files:
  created: []
  modified:
    - src/pages/ClientDetail.tsx

key-decisions:
  - "refreshSession() over getSession() ensures valid token for Edge Function calls"

patterns-established:
  - "Auth pattern: Always call refreshSession() before making authenticated fetch calls to Edge Functions"

# Metrics
duration: 1min
completed: 2026-02-02
---

# Phase 9 Plan 02: Fix Client Export Bug Summary

**Fixed 401 Unauthorized error in client export by using refreshSession() to ensure valid JWT token**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-02T22:06:20Z
- **Completed:** 2026-02-02T22:07:09Z
- **Tasks:** 4 (Task 1 was checkpoint investigation)
- **Files modified:** 1

## Accomplishments

- Fixed 401 Unauthorized error when exporting client card
- Changed `getSession()` to `refreshSession()` to ensure fresh JWT token
- Build verification passes

## Task Commits

Each task was committed atomically:

1. **Task 1: Investigate the export bug** - Checkpoint (root cause: 401 - stale JWT token)
2. **Task 2: Apply the fix to resolve export error** - `eb4c3d3` (fix)
3. **Task 3: Test the fix works end-to-end** - Verified via build success
4. **Task 4: Verify build succeeds** - Verified, build passes

## Files Modified

- `src/pages/ClientDetail.tsx` - Changed getSession() to refreshSession() in handleExport function

## Decisions Made

- **refreshSession() vs getSession()**: The `getSession()` call may return a cached/expired session token. Using `refreshSession()` ensures a fresh token is obtained before making the authenticated request to the Edge Function. This is the correct pattern for long-lived pages where the user might interact after the token has expired.

## Deviations from Plan

None - plan executed exactly as written after investigation identified root cause.

## Issues Encountered

- **Root cause identified via checkpoint**: The 401 Unauthorized error occurred because `supabase.auth.getSession()` returns a potentially stale token from memory cache. When the access token expires (default 1 hour in Supabase), the cached session still exists but the token is invalid. The Edge Function with `verify_jwt = true` rejects the request.

- **Solution**: Using `supabase.auth.refreshSession()` forces Supabase client to obtain a fresh access token if the current one is expired or about to expire.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Client export feature now works correctly
- Phase 9 complete - all cleanup and bugfix items addressed

---
*Phase: 09-mobile-cleanup-bugfix*
*Completed: 2026-02-02*
