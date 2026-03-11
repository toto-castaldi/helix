---
phase: 23-failure-ingestion
plan: 01
subsystem: api
tags: [webhook, supabase, docora, edge-function, postgres]

# Dependency graph
requires: []
provides:
  - sync_failed webhook ingestion in docora-webhook Edge Function
  - Database columns sync_error_message and sync_failed_at on lumio_repositories
  - sync_failed added to sync_status constraint
  - DocoraSyncFailedPayload and DocoraSyncFailedError types in shared docora.ts
  - SyncStatus type includes sync_failed variant
  - Auto-clear of error fields on successful file sync
affects: [24-error-display, 25-token-recovery]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Early branch pattern in webhook handler for different payload shapes"
    - "Auto-clear error fields on successful operation"

key-files:
  created:
    - supabase/migrations/00000000000021_sync_failed_support.sql
  modified:
    - supabase/functions/_shared/docora.ts
    - supabase/functions/docora-webhook/index.ts
    - src/shared/types/index.ts
    - src/components/repositories/SyncStatusBadge.tsx
    - GENERIC_AGENT.md

key-decisions:
  - "Early branch for sync_failed before file-specific payload parsing (different payload shape)"
  - "Auto-clear sync_error_message and sync_failed_at at both synced update locations"

patterns-established:
  - "Early branch in webhook for structurally different payloads: check action before parsing body into typed payload"

requirements-completed: [HOOK-01, HOOK-02]

# Metrics
duration: 4min
completed: 2026-03-06
---

# Phase 23 Plan 01: Failure Ingestion Summary

**Docora sync_failed webhook handler with DB migration, auto-clear on success, and crash-safe SyncStatusBadge**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-06T07:24:37Z
- **Completed:** 2026-03-06T07:28:48Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Database migration adds sync_failed to sync_status constraint and adds sync_error_message + sync_failed_at columns
- Webhook handler receives sync_failed events, validates HMAC, finds repo, persists failure status with error message
- Successful file webhooks auto-clear error fields at both update locations (lumioignore and file processing)
- SyncStatusBadge renders sync_failed without crashing (minimal entry for Phase 24 refinement)

## Task Commits

Each task was committed atomically:

1. **Task 1: Database migration, type updates, and documentation** - `ed93ba1` (feat)
2. **Task 2: Webhook handler -- sync_failed branch, handleSyncFailed, and auto-clear** - `852d529` (feat)

## Files Created/Modified
- `supabase/migrations/00000000000021_sync_failed_support.sql` - Migration: sync_failed constraint + error columns
- `supabase/functions/_shared/docora.ts` - DocoraSyncFailedPayload, DocoraSyncFailedError types, updated DocoraAction
- `supabase/functions/docora-webhook/index.ts` - handleSyncFailed function, early branch, auto-clear at both synced locations
- `src/shared/types/index.ts` - SyncStatus includes sync_failed, LumioRepository has sync_error_message and sync_failed_at
- `src/components/repositories/SyncStatusBadge.tsx` - sync_failed entry in statusConfig
- `GENERIC_AGENT.md` - Updated Database section with new columns, milestone note, and webhook action

## Decisions Made
- Early branch for sync_failed placed after Supabase client creation but before file-specific payload parsing (different payload structure requires separate parse)
- handleSyncFailed extracted as separate named function for clarity and maintainability

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- sync_failed webhook ingestion is complete and ready for Phase 24 (Error Display)
- Frontend SyncStatus type and SyncStatusBadge already handle sync_failed
- Phase 24 will refine the error display with detailed error messages from sync_error_message field

## Self-Check: PASSED

All 7 files verified present. Both task commits (ed93ba1, 852d529) verified in git log.

---
*Phase: 23-failure-ingestion*
*Completed: 2026-03-06*
