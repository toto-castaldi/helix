---
phase: 21-response-polish
plan: 01
subsystem: api
tags: [mcp, validation, json, serialization, deno, edge-functions]

# Dependency graph
requires:
  - phase: 20-tool-resource-quality
    provides: "toolError() helper with ErrorCategory types, isError: true on all error paths"
provides:
  - "validateToolInput() centralized validation for all 16 MCP tools"
  - "Validation helpers: isValidUuid, isValidDate, isPositiveNumber, isNonNegativeNumber, isNonEmptyString"
  - "stripNulls() recursive null-removal helper for JSON responses"
  - "Compact JSON serialization across all resource handlers"
affects: [helix-mcp, response-format]

# Tech tracking
tech-stack:
  added: []
  patterns: [centralized-tool-validation, compact-json-serialization, null-stripping]

key-files:
  created: []
  modified:
    - supabase/functions/helix-mcp/index.ts

key-decisions:
  - "Hand-rolled regex validation instead of schema library (Zod/Valibot) -- 16 tools with simple param types do not justify added dependency"
  - "isNonNegativeNumber for order_index (0 is valid first position)"
  - "No validation on resource URI parameters (tool params only, resources already handle invalid IDs via Supabase not_found)"
  - "No validation on boolean fields (is_group, completed, skipped) -- LLMs pass these correctly and Supabase handles coercion"
  - "Coach summary object uses JSON.stringify without stripNulls (constructed with || 0 defaults, no nulls possible)"

patterns-established:
  - "Validation gate pattern: validateToolInput() called before switch in executeTool()"
  - "stripNulls() wrapping on all resource JSON.stringify calls"
  - "Compact JSON (no whitespace) for all MCP resource responses"

requirements-completed: [POL-01, POL-02]

# Metrics
duration: 3min
completed: 2026-02-24
---

# Phase 21 Plan 01: Response Polish Summary

**Centralized input validation on all 16 MCP tools (47 parameter checks) and compact JSON serialization with null stripping across all 18 resource responses**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-24T21:35:01Z
- **Completed:** 2026-02-24T21:38:05Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Added validateToolInput() with per-tool validation covering 25 UUIDs, 4 dates, 2 enums, 12 numbers, 2 strings, 2 arrays across 16 tools
- Integrated validation gate in executeTool() that returns toolError('validation_error', ...) before any database query
- Added stripNulls() recursive helper that removes null-valued keys while preserving 0, false, and empty strings
- Replaced all 18 pretty-printed JSON.stringify calls with compact minified versions using stripNulls()

## Task Commits

Each task was committed atomically:

1. **Task 1: Add input validation helpers and validateToolInput function** - `4cbefa6` (feat)
2. **Task 2: Add stripNulls helper and compact all JSON.stringify calls** - `831c4ea` (feat)

## Files Created/Modified
- `supabase/functions/helix-mcp/index.ts` - Added validation helpers, validateToolInput(), stripNulls(), validation gate in executeTool(), compact JSON in all resource handlers

## Decisions Made
- Used hand-rolled regex validation instead of a schema library (Zod/Valibot) -- the 47 parameter validations are simple type/format checks that do not justify an external dependency
- Used isNonNegativeNumber for order_index since 0 is a valid first position in exercise ordering
- Did not validate resource URI parameters -- POL-01 scope is tool parameters only; resources already return not_found for invalid IDs
- Did not validate boolean fields (is_group, completed, skipped) -- LLMs handle these correctly and Supabase does type coercion
- Coach summary constructed object skips stripNulls wrapping since all values use `|| 0` defaults

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- MCP server now has comprehensive input validation and compact responses
- Ready for remaining phase 21 plans or phase 22
- All existing tool behavior preserved; only error paths for invalid input are new

## Self-Check: PASSED

- FOUND: supabase/functions/helix-mcp/index.ts
- FOUND: .planning/phases/21-response-polish/21-01-SUMMARY.md
- FOUND: commit 4cbefa6
- FOUND: commit 831c4ea

---
*Phase: 21-response-polish*
*Completed: 2026-02-24*
