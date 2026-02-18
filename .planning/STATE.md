# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-17)

**Core value:** Professional landing page with domain separation for Helix apps
**Current focus:** v1.4 Landing Page + Domini (COMPLETE)

## Current Position

Phase: 15 of 15 (Deploy Pipeline)
Plan: 2 of 2 in current phase (COMPLETE)
Status: All plans complete -- v1.4 milestone shipped
Last activity: 2026-02-18 — Completed 15-02 SSL & Server Setup

Progress: [██████████] 100% (5/5 plans)

## Performance Metrics

**Cumulative (v1.0 + v1.1 + v1.2 + v1.3):**
- Total plans completed: 19 (6 + 10 + 2 + 1)
- Total phases completed: 11 (4 + 5 + 1 + 1)

**v1.4 Landing Page + Domini:**
- Total plans: 5 across 4 phases
- Completed: 5

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 12-01 | Landing Build Setup | 2m 33s | 2 | 7 |
| 13-01 | Landing Page Content | 3m | 2 | 3 |
| 14-01 | Domain Routing | ~30m | 2 | 3 |
| 15-01 | Deploy Pipeline | 2m | 1 | 1 |
| 15-02 | SSL & Server Setup | ~30m | 1 | 0 |

## Accumulated Context

### Decisions

- **12-01:** Landing page uses vanilla JS (no React), no PWA, port 5175, div#app instead of div#root
- **13-01:** Italian default fallback language, language toggle as fixed pill (no navbar), inline SVG icons for features, full re-render on language switch
- **14-01:** Three-domain split (landing at root domain, coach on subdomain, live unchanged); separate document roots (/var/www/helix-landing for landing, /var/www/helix for coach); certbot placeholders in source Nginx configs
- **15-01:** Build steps grouped before deploy steps; Nginx live config excluded from sync; cert-aware approach disables 443 block when certs missing
- **15-02:** Certbot with --nginx plugin for automatic SSL integration; deploy user sudo via /etc/sudoers.d/helix-deploy; SSL certs regenerated after initial HTTP-only deploy
- Decisions are also logged in PROJECT.md Key Decisions table.

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-18
Stopped at: Completed 15-02-PLAN.md (SSL & Server Setup) -- v1.4 milestone complete
Resume file: None

---
*State tracking: v1.4 milestone COMPLETE -- all 5 plans across 4 phases shipped*
