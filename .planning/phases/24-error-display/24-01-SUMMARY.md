---
phase: 24-error-display
plan: 01
subsystem: ui
tags: [react, tailwind, shadcn, repository-card, error-display]

# Dependency graph
requires:
  - phase: 23-failure-ingestion
    provides: sync_failed status, sync_error_message field on LumioRepository type
provides:
  - sync_failed error block with "Aggiorna token" button on RepositoryCard
  - onUpdateToken callback prop drilled from Repositories page through RepositoryList to RepositoryCard
  - Stub no-op handler for onUpdateToken (Phase 25 will replace with dialog logic)
affects: [25-token-update]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "sync_failed error block with action button inside destructive container"
    - "onUpdateToken callback prop-drilling chain matching onEdit/onDelete/onViewCards pattern"

key-files:
  created: []
  modified:
    - src/components/repositories/RepositoryCard.tsx
    - src/components/repositories/RepositoryList.tsx
    - src/pages/Repositories.tsx

key-decisions:
  - "Kept error and sync_failed blocks as separate conditionals (different source fields, different behavior)"
  - "Used standard outline button variant inside destructive container without extra styling overrides"

patterns-established:
  - "sync_failed error display: red box with message text + action button"

requirements-completed: [DISP-01, DISP-02]

# Metrics
duration: 3min
completed: 2026-03-11
---

# Phase 24 Plan 01: Error Display Summary

**sync_failed error block with "Aggiorna token" action button on RepositoryCard, callback prop-drilled to Repositories page as no-op stub**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-11T08:42:43Z
- **Completed:** 2026-03-11T08:46:19Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- RepositoryCard displays sync_error_message in a red box with "Aggiorna token" button when sync_status is 'sync_failed'
- onUpdateToken callback wired from Repositories page through RepositoryList to RepositoryCard, following the exact same pattern as onEdit/onDelete/onViewCards
- Existing error block for generic 'error' status preserved unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: Add sync_failed error block with action button to RepositoryCard** - `4991a0d` (feat)
2. **Task 2: Wire onUpdateToken callback through RepositoryList to Repositories page** - `f0cffa2` (feat)

## Files Created/Modified
- `src/components/repositories/RepositoryCard.tsx` - Added Button import, onUpdateToken prop, sync_failed error block with message + button
- `src/components/repositories/RepositoryList.tsx` - Added onUpdateToken to props interface and pass-through to RepositoryCard
- `src/pages/Repositories.tsx` - Added onUpdateToken stub no-op handler to RepositoryList

## Decisions Made
- Kept error and sync_failed blocks as separate conditional blocks since they use different source fields (sync_error vs sync_error_message) and have different behavior (no button vs button)
- Used standard outline button variant inside the destructive container without extra styling overrides -- contrast appears sufficient

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 25 can wire the onUpdateToken callback to a token update dialog, replacing the no-op stub in Repositories.tsx
- The prop-drilling chain is complete and ready for Phase 25's dialog logic

## Self-Check: PASSED

All files verified to exist. All commits verified in git log.

---
*Phase: 24-error-display*
*Completed: 2026-03-11*
