---
phase: 25-token-recovery
plan: 01
subsystem: api
tags: [edge-function, docora, patch, token-update, supabase]

# Dependency graph
requires:
  - phase: 24-error-display
    provides: Error display on RepositoryCard with onUpdateToken callback
provides:
  - docora-update-token Edge Function handling token update + sync reset
  - PATCH method support in docoraApiCall shared helper
  - Deploy workflow step for docora-update-token
affects: [25-02-PLAN, frontend-token-dialog]

# Tech tracking
tech-stack:
  added: []
  patterns: [docora-first-db-second ordering for external API calls]

key-files:
  created:
    - supabase/functions/docora-update-token/index.ts
  modified:
    - supabase/functions/_shared/docora.ts
    - .github/workflows/deploy.yml

key-decisions:
  - "Docora-first, DB-second ordering: fail fast if Docora rejects token before writing to database"

patterns-established:
  - "External API call before DB write: validate with external service first, only persist on success"

requirements-completed: [TOKN-02, TOKN-03, TOKN-04]

# Metrics
duration: 2min
completed: 2026-03-11
---

# Phase 25 Plan 01: Token Recovery Edge Function Summary

**docora-update-token Edge Function with PATCH API support, Docora-first fail-fast ordering, and sync status reset**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-11T12:41:26Z
- **Completed:** 2026-03-11T12:43:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created docora-update-token Edge Function following docora-register patterns (auth, CORS, ownership)
- Added PATCH method to docoraApiCall shared helper
- Implemented Docora-first ordering: PATCH API call before DB update, returning 502 if Docora rejects
- On success: saves new token, resets sync_status to 'pending', clears sync_error_message and sync_failed_at
- Added deploy step to GitHub Actions workflow

## Task Commits

Each task was committed atomically:

1. **Task 1: Add PATCH support and create docora-update-token Edge Function** - `4f0005a` (feat)
2. **Task 2: Add docora-update-token to deploy workflow** - `d7fd099` (chore)

## Files Created/Modified
- `supabase/functions/docora-update-token/index.ts` - New Edge Function handling token update flow
- `supabase/functions/_shared/docora.ts` - Added PATCH to method union type
- `.github/workflows/deploy.yml` - Added docora-update-token deploy step

## Decisions Made
- Docora-first, DB-second ordering: if Docora PATCH fails, no database changes are made, coach is informed to try a different token

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Edge Function ready for frontend integration
- Plan 25-02 (UpdateTokenDialog) can call this function to complete the token recovery flow
- The function expects `{ repositoryId, newToken }` POST body with Authorization Bearer header

## Self-Check: PASSED

All files verified present, all commits verified in git log.

---
*Phase: 25-token-recovery*
*Completed: 2026-03-11*
