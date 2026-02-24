# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core value:** During group lessons, the coach can manage shared exercises from a single view, completing them once for all participants
**Current focus:** Phase 19 - Protocol Compliance

## Current Position

Phase: 19 of 22 (Protocol Compliance) -- COMPLETE
Plan: 1 of 1 in current phase
Status: Phase Complete
Last activity: 2026-02-24 — Completed 19-01 (MCP Protocol 2025-03-26 Upgrade)

Progress: [██████████████████████████████] 97% (30/31 plans across all milestones, 1/1 phase 19 plans)

## Performance Metrics

**Cumulative (v1.0 through v1.5):**
- Total plans completed: 30 (6 + 10 + 2 + 1 + 5 + 2 + 3 + 1)
- Total phases completed: 18 (4 + 5 + 1 + 1 + 4 + 1 + 1 + 1)

**v1.6 (in progress):**
- Phases: 18-22 (5 phases, plans TBD)
- Completed: 2/5 phases (Phase 18, 19 complete)

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v1.6]: Keep hand-rolled JSON-RPC, do NOT adopt MCP SDK (2,500 lines business logic preserved)
- [v1.6]: Target MCP protocol version 2025-03-26 (skip 2025-06-18)
- [v1.6]: API key auth only, remove all OAuth 2.1 code
- [18-01]: Kept Google OAuth refs in CLAUDE.md (Supabase Auth, not MCP); API key is sole MCP auth
- [18-02]: Removed SUPABASE_ANON_KEY from authenticateRequest; cleaned CORS headers to match API key-only model
- [18-03]: Inner join ownership verification pattern for write tools; English "not found" error messages; verifyClientOwnership existence check for accurate violation logging
- [19-01]: Notification detection before auth check (notifications/initialized sent without API key); batch notification support for spec completeness

### Pending Todos

None.

### Blockers/Concerns

- Claude Code has known bugs where custom HTTP headers silently drop (issues #7290, #14977, #17069) -- OAuth removal in Phase 18 prevents auth loops
- ~~6 write tools bypass RLS via service role without ownership checks -- security P0 in Phase 18~~ RESOLVED in 18-03 (all 8 write tools now have ownership checks)

## Session Continuity

Last session: 2026-02-24
Stopped at: Completed 19-01-PLAN.md (MCP Protocol 2025-03-26 Upgrade) -- Phase 19 complete
Resume file: .planning/phases/19-protocol-compliance/19-01-SUMMARY.md

---
*State tracking: v1.6 milestone — phase 19 complete, ready for phase 20*
