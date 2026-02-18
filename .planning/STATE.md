# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-17)

**Core value:** Professional landing page with domain separation for Helix apps
**Current focus:** Phase 14 - Domain Routing (COMPLETE)

## Current Position

Phase: 14 of 15 (Domain Routing)
Plan: 1 of 1 in current phase (COMPLETE)
Status: Phase 14 complete
Last activity: 2026-02-18 — Completed 14-01 Domain Routing

Progress: [█████░░░░░] 50% (3/5 plans... wait: counting v1.4 plans: 12-01, 13-01, 14-01 = 3 of 5)

Progress: [██████░░░░] 60% (3/5 plans)

## Performance Metrics

**Cumulative (v1.0 + v1.1 + v1.2 + v1.3):**
- Total plans completed: 19 (6 + 10 + 2 + 1)
- Total phases completed: 11 (4 + 5 + 1 + 1)

**v1.4 Landing Page + Domini:**
- Total plans: 5 across 4 phases
- Completed: 3

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 12-01 | Landing Build Setup | 2m 33s | 2 | 7 |
| 13-01 | Landing Page Content | 3m | 2 | 3 |
| 14-01 | Domain Routing | ~30m | 2 | 3 |

## Accumulated Context

### Decisions

- **12-01:** Landing page uses vanilla JS (no React), no PWA, port 5175, div#app instead of div#root
- **13-01:** Italian default fallback language, language toggle as fixed pill (no navbar), inline SVG icons for features, full re-render on language switch
- **14-01:** Three-domain split (landing at root domain, coach on subdomain, live unchanged); separate document roots (/var/www/helix-landing for landing, /var/www/helix for coach); certbot placeholders in source Nginx configs
- Decisions are also logged in PROJECT.md Key Decisions table.

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-18
Stopped at: Completed 14-01-PLAN.md (Domain Routing)
Resume file: None

---
*State tracking: v1.4 milestone — Phase 14 complete, ready for Phase 15*
