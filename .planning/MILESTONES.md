# Project Milestones: Helix

## v1.1 Group Exercise Improvements (Shipped: 2026-02-02)

**Delivered:** Reusable group exercise templates with full UI and MCP integration, client view separation in tablet (individual vs group exercises), and mobile app cleanup.

**Phases completed:** 5-9 (10 plans total)

**Key accomplishments:**
- Reusable group exercise templates — coaches can create, edit, and apply templates to sessions
- MCP template integration — 8 new tools for AI-assisted template management
- Client view separation in tablet — two tabs "I miei" and "Gruppo" for clearer coaching
- Template-linked session exercises with edit blocking for consistency
- Mobile app cleanup — removed Live feature (tablet-only), deleted 6 unused components
- Client export bugfix — fixed 401 error with JWT token refresh

**Stats:**
- 71 files modified
- +9,604 / -1,434 lines (TypeScript/SQL)
- 5 phases, 10 plans
- 44 days from start to ship

**Git range:** `feat(05-01)` -> `docs(09)`

**What's next:** TBD — next milestone goals

---

## v1.0 Esercizi di Gruppo (Shipped: 2026-01-28)

**Delivered:** Group exercise support for live coaching — coaches can mark exercises as "group", view all group exercises across clients, and complete them for all participants with one tap.

**Phases completed:** 1-4 (6 plans total)

**Key accomplishments:**
- Database schema extended with `is_group` column and partial index for efficient filtering
- MCP server updated to expose group exercises (Claude can plan group workouts)
- Planning UI with "Di gruppo" toggle and visual badge indicators
- Live tablet group view with complete-for-all and skip-per-participant
- RPC functions for atomic cross-session updates with realtime sync
- Full backward compatibility — existing sessions unchanged

**Stats:**
- 49 files modified
- ~7,000 lines added (TypeScript/SQL)
- 4 phases, 6 plans
- 39 days from start to ship

**Git range:** `feat(01-01)` -> `feat(04-03)`

**What's next:** v1.1 Group Exercise Improvements (shipped)

---
