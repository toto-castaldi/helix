---
phase: 25-token-recovery
plan: 02
subsystem: ui
tags: [react, dialog, token-update, supabase-functions, pat]

# Dependency graph
requires:
  - phase: 25-token-recovery
    plan: 01
    provides: docora-update-token Edge Function for backend token update
  - phase: 24-error-display
    provides: sync_failed error block with onUpdateToken callback on RepositoryCard
provides:
  - UpdateTokenDialog component for PAT token input
  - Wired onUpdateToken callback opening dialog from sync_failed cards
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: [centered-card-dialog for simple forms vs full-screen-dialog for content browsers]

key-files:
  created:
    - src/components/repositories/UpdateTokenDialog.tsx
  modified:
    - src/components/repositories/index.ts
    - src/pages/Repositories.tsx

key-decisions:
  - "Centered Card dialog (not full-screen) for simple token form -- different from RepositoryCardsDialog pattern"

patterns-established:
  - "Card-centered dialog: for simple form dialogs use Card component centered on backdrop, not full-screen overlay"

requirements-completed: [TOKN-01, TOKN-04]

# Metrics
duration: 3min
completed: 2026-03-11
---

# Phase 25 Plan 02: UpdateTokenDialog Summary

**UpdateTokenDialog component with PAT input, Edge Function call, and state-controlled rendering wired via onUpdateToken callback**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-11T12:45:19Z
- **Completed:** 2026-03-11T12:48:28Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created UpdateTokenDialog component with password-type PAT input, loading state, error display, and cancel/submit buttons
- Integrated with docora-update-token Edge Function for backend token update
- Wired dialog into Repositories page replacing no-op stub with state-controlled rendering
- Realtime subscription automatically clears sync_failed error when token update succeeds

## Task Commits

Each task was committed atomically:

1. **Task 1: Create UpdateTokenDialog component** - `8bbf3d8` (feat)
2. **Task 2: Wire UpdateTokenDialog into Repositories page** - `913e961` (feat)

## Files Created/Modified
- `src/components/repositories/UpdateTokenDialog.tsx` - Token update dialog with PAT input, loading/error states, Edge Function call
- `src/components/repositories/index.ts` - Added UpdateTokenDialog barrel export
- `src/pages/Repositories.tsx` - Added updatingTokenRepo state, wired onUpdateToken to setUpdatingTokenRepo, rendered UpdateTokenDialog

## Decisions Made
- Used centered Card dialog (not full-screen like RepositoryCardsDialog) since this is a simple form, not a content browser

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Token recovery flow is complete end-to-end: sync_failed card shows "Aggiorna token" button, dialog opens, coach pastes new PAT, Edge Function updates Docora + DB, realtime clears error
- Phase 25 is complete -- all plans executed

## Self-Check: PASSED

All files verified present, all commits verified in git log.

---
*Phase: 25-token-recovery*
*Completed: 2026-03-11*
