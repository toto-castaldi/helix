# Roadmap: Helix

## Milestones

- ✅ **v1.0 Esercizi di Gruppo** — Phases 1-4 (shipped 2026-01-28)
- ✅ **v1.1 Group Exercise Improvements** — Phases 5-9 (shipped 2026-02-02)
- ✅ **v1.2 Lumio Exercise Images** — Phase 10 (shipped 2026-02-12)
- ✅ **v1.3 Image Auto-Play** — Phase 11 (shipped 2026-02-13)
- **v1.4 Landing Page + Domini** — Phases 12-15 (in progress)

## Phases

<details>
<summary>v1.0 Esercizi di Gruppo (Phases 1-4) — SHIPPED 2026-01-28</summary>

See `.planning/milestones/v1.0-ROADMAP.md` for details.

</details>

<details>
<summary>v1.1 Group Exercise Improvements (Phases 5-9) — SHIPPED 2026-02-02</summary>

See `.planning/milestones/v1.1-ROADMAP.md` for details.

</details>

<details>
<summary>v1.2 Lumio Exercise Images (Phase 10) — SHIPPED 2026-02-12</summary>

See `.planning/milestones/v1.2-ROADMAP.md` for details.

</details>

<details>
<summary>v1.3 Image Auto-Play (Phase 11) — SHIPPED 2026-02-13</summary>

See `.planning/milestones/v1.3-ROADMAP.md` for details.

</details>

### v1.4 Landing Page + Domini (In Progress)

**Milestone Goal:** Helix presents itself with a professional bilingual landing page at helix.toto-castaldi.com while the coach app moves to its own subdomain, with full infrastructure support.

- [x] **Phase 12: Landing Build Setup** - Third Vite entry point for the landing page (completed 2026-02-18)
- [x] **Phase 13: Landing Page Content** - Hero, features, CTA, and IT/EN toggle (completed 2026-02-18)
- [ ] **Phase 14: Domain Routing** - Three-domain architecture (landing, coach, live)
- [ ] **Phase 15: Deploy Pipeline** - GitHub Actions, Nginx, and HTTPS for all domains

## Phase Details

### Phase 12: Landing Build Setup
**Goal**: The landing page has its own Vite entry point that builds independently alongside the existing coach and live apps
**Depends on**: Nothing (first phase of v1.4)
**Requirements**: LAND-05
**Success Criteria** (what must be TRUE):
  1. `landing.html` exists as a third entry point alongside `index.html` and `live.html`
  2. `npm run build:landing` produces a working static build in a separate output directory
  3. `npm run dev:landing` starts a dev server that serves the landing page
  4. Existing `npm run dev` and `npm run dev:live` continue to work unchanged
**Plans**: 1 plan

Plans:
- [ ] 12-01-PLAN.md — Third Vite entry point (landing.html, vite.config.landing.ts, src/landing/, public-landing/, npm scripts)

### Phase 13: Landing Page Content
**Goal**: Visitors see a professional bilingual landing page that communicates what Helix is and links to the apps
**Depends on**: Phase 12
**Requirements**: LAND-01, LAND-02, LAND-03, LAND-04
**Success Criteria** (what must be TRUE):
  1. Landing page displays hero section with Helix tagline, logo, and visual identity
  2. Features/benefits section explains the coaching service clearly
  3. CTA buttons link to Coach app (coach.helix.toto-castaldi.com) and Live app (live.helix.toto-castaldi.com)
  4. User can toggle between Italian and English, and all visible text changes accordingly
  5. Page is mobile-friendly and looks professional on both phone and desktop
**Plans**: 1 plan

Plans:
- [ ] 13-01-PLAN.md — Complete bilingual landing page: hero, features, CTA, and IT/EN language toggle

### Phase 14: Domain Routing
**Goal**: Each Helix application is served on its correct domain with proper separation
**Depends on**: Phase 12 (landing build must exist), Phase 13 (content must exist)
**Requirements**: DOM-01, DOM-02, DOM-03
**Success Criteria** (what must be TRUE):
  1. helix.toto-castaldi.com serves the landing page
  2. coach.helix.toto-castaldi.com serves the coach app (previously at helix.toto-castaldi.com)
  3. live.helix.toto-castaldi.com continues to serve the live tablet app unchanged
  4. Supabase auth redirect URLs work correctly for the new coach subdomain
**Plans**: TBD

Plans:
- [ ] 14-01: Nginx configuration for three-domain routing and DNS setup

### Phase 15: Deploy Pipeline
**Goal**: All three apps build, deploy, and serve over HTTPS automatically on every push to main
**Depends on**: Phase 14 (domain routing must be defined)
**Requirements**: INFRA-01, INFRA-02, INFRA-03
**Success Criteria** (what must be TRUE):
  1. GitHub Actions workflow builds and deploys landing, coach, and live apps in a single pipeline
  2. Nginx serves all three domains with correct document roots and SPA fallback
  3. coach.helix.toto-castaldi.com has a valid HTTPS certificate (via Let's Encrypt / certbot)
  4. A push to main deploys all three apps without manual intervention
**Plans**: TBD

Plans:
- [ ] 15-01: GitHub Actions update for three-app build and deploy
- [ ] 15-02: Nginx and HTTPS configuration for all domains

## Progress

**Execution Order:**
Phases execute in numeric order: 12 -> 13 -> 14 -> 15

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-4 | v1.0 | 6/6 | Complete | 2026-01-28 |
| 5-9 | v1.1 | 10/10 | Complete | 2026-02-02 |
| 10 | v1.2 | 2/2 | Complete | 2026-02-12 |
| 11 | v1.3 | 1/1 | Complete | 2026-02-13 |
| 12. Landing Build Setup | v1.4 | 1/1 | Complete | 2026-02-18 |
| 13. Landing Page Content | v1.4 | 1/1 | Complete | 2026-02-18 |
| 14. Domain Routing | v1.4 | 0/1 | Not started | - |
| 15. Deploy Pipeline | v1.4 | 0/2 | Not started | - |

---
*Roadmap created: 2026-01-28*
*Last updated: 2026-02-18 after Phase 13 completion*
