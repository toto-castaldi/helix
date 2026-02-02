# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-30)

**Core value:** Group exercise management for live coaching - templates, client view separation
**Current focus:** Phase 8 in progress, client view separation

## Current Position

Phase: 8 of 9 (Client View Separation)
Plan: 1 of ? in current phase
Status: In progress
Last activity: 2026-02-02 - Completed 08-01-PLAN.md

Progress: [########--] 100% (8/8 plans complete in scope)

## Performance Metrics

**Velocity:**
- Total plans completed: 8 (v1.5)
- Average duration: 5m
- Total execution time: 41m

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 05 | 1 | 2m | 2m |
| 06 | 3 | 18m | 6m |
| 07 | 3 | 16m | 5m |
| 08 | 1 | 5m | 5m |

**Recent Trend:**
- Last 5 plans: 06-03 (5m), 07-01 (8m), 07-02 (5m), 07-03 (3m), 08-01 (5m)
- Trend: Stable

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- v1.0: Flag booleano `is_group` works well for marking group exercises
- v1.0: Partial index for is_group column is efficient
- v1.0: SECURITY INVOKER for RPC functions respects RLS
- v1.1: RLS pattern for child tables: optimized subquery `IN (select ...)`
- v1.1: exercise_id ON DELETE RESTRICT (coach must remove from templates first)
- v1.2: ON DELETE RESTRICT on template_id FK to block template deletion when in use
- v1.2: Partial index for template_id (WHERE NOT NULL) for efficient lookups
- v1.2: canDeleteTemplate() check before delete to provide clear error message
- v1.3: Full-page overlay pattern for template management (matches ExercisePicker)
- v1.3: Local state for exercise editing in TemplateForm, persisted on save
- v1.3: Template exercises linked via template_id (not copied independently)
- v1.3: Edit blocking in session view for template-linked exercises
- v1.4: MCP resource preview includes exercise_count + first 3 names
- v1.4: MCP detail sorts exercises by order_index
- v1.4: Filter by user_id in MCP queries (explicit RLS compliance)
- v1.5: MCP template CRUD tools verify ownership via user_id
- v1.5: delete_group_template checks canDeleteTemplate pattern
- v1.6: mode parameter required for apply_template_to_session (no default)
- v1.7: Tab filtering with index mapping for proper exercise selection

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-02-02
Stopped at: Completed 08-01-PLAN.md
Resume file: None

---
*State tracking: Phase 8 plan 01 complete, client view tabs implemented*
