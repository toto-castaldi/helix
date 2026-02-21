# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core value:** During group lessons, the coach can manage shared exercises from a single view, completing them once for all participants
**Current focus:** Phase 18 - Security & Dead Code Removal

## Current Position

Phase: 18 of 22 (Security & Dead Code Removal)
Plan: 0 of ? in current phase
Status: Ready to plan
Last activity: 2026-02-21 — v1.6 roadmap created

Progress: [██████████████████████████░░░░] 86% (26/30 plans across all milestones, 0/5 v1.6 phases)

## Performance Metrics

**Cumulative (v1.0 through v1.5):**
- Total plans completed: 28 (6 + 10 + 2 + 1 + 5 + 2 + 2)
- Total phases completed: 17 (4 + 5 + 1 + 1 + 4 + 1 + 1)

**v1.6 (in progress):**
- Phases: 18-22 (5 phases, plans TBD)
- Completed: 0/5 phases

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v1.6]: Keep hand-rolled JSON-RPC, do NOT adopt MCP SDK (2,500 lines business logic preserved)
- [v1.6]: Target MCP protocol version 2025-03-26 (skip 2025-06-18)
- [v1.6]: API key auth only, remove all OAuth 2.1 code

### Pending Todos

None.

### Blockers/Concerns

- Claude Code has known bugs where custom HTTP headers silently drop (issues #7290, #14977, #17069) -- OAuth removal in Phase 18 prevents auth loops
- 6 write tools bypass RLS via service role without ownership checks -- security P0 in Phase 18

## Session Continuity

Last session: 2026-02-21
Stopped at: v1.6 roadmap created, ready to plan Phase 18
Resume file: None

---
*State tracking: v1.6 milestone — roadmap created, ready to plan*
