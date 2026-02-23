# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core value:** During group lessons, the coach can manage shared exercises from a single view, completing them once for all participants
**Current focus:** Phase 18 - Security & Dead Code Removal

## Current Position

Phase: 18 of 22 (Security & Dead Code Removal)
Plan: 2 of 3 in current phase
Status: Executing
Last activity: 2026-02-23 — Completed 18-02 (Edge Function OAuth Dead Code Removal)

Progress: [███████████████████████████░░░] 90% (28/31 plans across all milestones, 2/3 phase 18 plans)

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
- [18-01]: Kept Google OAuth refs in CLAUDE.md (Supabase Auth, not MCP); API key is sole MCP auth
- [18-02]: Removed SUPABASE_ANON_KEY from authenticateRequest; cleaned CORS headers to match API key-only model

### Pending Todos

None.

### Blockers/Concerns

- Claude Code has known bugs where custom HTTP headers silently drop (issues #7290, #14977, #17069) -- OAuth removal in Phase 18 prevents auth loops
- 6 write tools bypass RLS via service role without ownership checks -- security P0 in Phase 18

## Session Continuity

Last session: 2026-02-23
Stopped at: Completed 18-02-PLAN.md (Edge Function OAuth Dead Code Removal)
Resume file: .planning/phases/18-security-dead-code-removal/18-02-SUMMARY.md

---
*State tracking: v1.6 milestone — phase 18, plan 02 complete*
