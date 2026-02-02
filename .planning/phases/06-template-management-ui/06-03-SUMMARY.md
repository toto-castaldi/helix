---
phase: 06-template-management-ui
plan: 03
subsystem: ui
tags: [react, typescript, templates, sessions, linked-exercises]

# Dependency graph
requires:
  - phase: 06-01
    provides: template_id column on session_exercises, useGroupTemplates hook
  - phase: 06-02
    provides: Template management UI components
provides:
  - applyTemplateToSession function for copying template exercises to sessions
  - ApplyTemplateDialog component for template selection with Add/Replace mode
  - Edit blocking for template-linked exercises in SessionExerciseCard
  - "Template" badge indicator for linked exercises
affects: [live-tablet-integration, 07-mcp-template-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Linked exercise pattern: exercises with template_id have read-only controls"
    - "Add/Replace mode: coach chooses to append or replace existing group exercises"

key-files:
  created:
    - src/components/templates/ApplyTemplateDialog.tsx
  modified:
    - src/hooks/useGroupTemplates.ts
    - src/components/templates/index.ts
    - src/pages/SessionDetail.tsx
    - src/components/sessions/SessionExerciseCard.tsx

key-decisions:
  - "Template exercises are linked via template_id (not copied independently)"
  - "Linked exercises cannot be edited in session view - coach must edit template"
  - "Skipped toggle remains enabled for linked exercises (per-session flexibility)"
  - "Add mode appends, Replace mode removes existing group exercises first"

patterns-established:
  - "Template badge pattern: LayoutTemplate icon with dashed border for visual distinction"
  - "Read-only exercise pattern: controls disabled with opacity-50 styling"

# Metrics
duration: 5min
completed: 2026-02-02
---

# Phase 6 Plan 03: Apply Template to Session Summary

**Template application with linked behavior: exercises reference template via template_id, controls disabled in session view, Add/Replace mode selection**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-02T14:00:00Z
- **Completed:** 2026-02-02T14:05:00Z
- **Tasks:** 4
- **Files modified:** 5

## Accomplishments
- Implemented applyTemplateToSession function with Add/Replace mode support
- Created ApplyTemplateDialog with template selection and mode choice
- Added Template button to SessionDetail exercises section
- Template-linked exercises show "Template" badge and have disabled edit controls
- Skipped toggle remains functional for per-session flexibility

## Task Commits

Each task was committed atomically:

1. **Task 1: Add applyTemplateToSession to useGroupTemplates** - (feat)
2. **Task 2: Create ApplyTemplateDialog and integrate with SessionDetail** - (feat)
3. **Task 3: Block editing for template-linked exercises** - (feat)
4. **Task 4: Human verification checkpoint** - APPROVED

_Note: Commits to be created by user (per project rules: "Never execute git commands")_

## Files Created/Modified
- `src/hooks/useGroupTemplates.ts` - Added applyTemplateToSession function with Add/Replace mode
- `src/components/templates/ApplyTemplateDialog.tsx` - Template selection dialog with mode choice
- `src/components/templates/index.ts` - Added ApplyTemplateDialog export
- `src/pages/SessionDetail.tsx` - Added Template button and dialog integration
- `src/components/sessions/SessionExerciseCard.tsx` - Disabled controls for template exercises, added Template badge

## Decisions Made
- Template exercises are linked (template_id set) not copied - enables consistent updates
- Edit blocking in session view: coach must edit the template itself to change exercise parameters
- Skipped toggle remains enabled - allows per-session flexibility without modifying template
- Add mode calculates new order_index from existing max; Replace mode deletes existing group exercises first

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 6 complete: full template management flow implemented
- Template CRUD, application to sessions, and linked behavior all working
- Ready for Phase 7: MCP Template Integration (resources and tools for AI access)
- Alternative: Phase 8 (Client View Separation) can proceed in parallel

---
*Phase: 06-template-management-ui*
*Completed: 2026-02-02*
