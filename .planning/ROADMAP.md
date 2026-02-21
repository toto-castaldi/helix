# Roadmap: Helix

## Milestones

- ✅ **v1.0 Esercizi di Gruppo** — Phases 1-4 (shipped 2026-01-28)
- ✅ **v1.1 Group Exercise Improvements** — Phases 5-9 (shipped 2026-02-02)
- ✅ **v1.2 Lumio Exercise Images** — Phase 10 (shipped 2026-02-12)
- ✅ **v1.3 Image Auto-Play** — Phase 11 (shipped 2026-02-13)
- ✅ **v1.4 Landing Page + Domini** — Phases 12-15 (shipped 2026-02-18)
- 🚧 **v1.5 Versioning GSD** — Phases 16-17 (in progress)

## Phases

<details>
<summary>✅ v1.0 Esercizi di Gruppo (Phases 1-4) — SHIPPED 2026-01-28</summary>

See `.planning/milestones/v1.0-ROADMAP.md` for details.

</details>

<details>
<summary>✅ v1.1 Group Exercise Improvements (Phases 5-9) — SHIPPED 2026-02-02</summary>

See `.planning/milestones/v1.1-ROADMAP.md` for details.

</details>

<details>
<summary>✅ v1.2 Lumio Exercise Images (Phase 10) — SHIPPED 2026-02-12</summary>

See `.planning/milestones/v1.2-ROADMAP.md` for details.

</details>

<details>
<summary>✅ v1.3 Image Auto-Play (Phase 11) — SHIPPED 2026-02-13</summary>

See `.planning/milestones/v1.3-ROADMAP.md` for details.

</details>

<details>
<summary>✅ v1.4 Landing Page + Domini (Phases 12-15) — SHIPPED 2026-02-18</summary>

See `.planning/milestones/v1.4-ROADMAP.md` for details.

</details>

### 🚧 v1.5 Versioning GSD (In Progress)

**Milestone Goal:** Replace automatic date-time versioning with GSD milestone version, visible across all three apps.

#### Phase 16: CI/CD Pipeline Cleanup
- [x] **Phase 16: CI/CD Pipeline Cleanup** - Remove date-time versioning and extract milestone version from MILESTONES.md (completed 2026-02-21)

#### Phase 17: Version Display
- [ ] **Phase 17: Version Display** - Show milestone version on coach, live, and landing apps with GitHub link

## Phase Details

### Phase 16: CI/CD Pipeline Cleanup
**Goal**: Build pipeline extracts version from GSD milestones instead of generating date-time stamps
**Depends on**: Nothing (first phase of v1.5)
**Requirements**: CICD-01, CICD-02, CICD-03, CICD-04
**Success Criteria** (what must be TRUE):
  1. Running `npm run build` produces a build that knows the current milestone version (e.g., `v1.5`) without any date-time stamp
  2. The deploy workflow no longer generates a `YYYY.MM.DD.HHMM` version string
  3. The deploy workflow no longer commits `chore: update version to...` after each deploy
  4. The deploy workflow no longer updates README with a version badge/string
**Plans**: 1 plan

Plans:
- [x] 16-01-PLAN.md — Replace date-time versioning with milestone extraction and clean up README

### Phase 17: Version Display
**Goal**: Users can see the current Helix version on every app surface and access the source repository
**Depends on**: Phase 16
**Requirements**: VDSP-01, VDSP-02, VDSP-03, VDSP-04
**Success Criteria** (what must be TRUE):
  1. Coach app displays the milestone version (e.g., `v1.5`) in the user menu
  2. Live tablet app displays the milestone version in the header or toolbar area
  3. Landing page displays the milestone version
  4. Landing page contains a clickable link to the GitHub repository (`github.com/toto-castaldi/helix`)
**Plans**: 1 plan

Plans:
- [ ] 17-01-PLAN.md — Add version display to live tablet and landing page with GitHub link

## Progress

**Execution Order:**
Phases execute in numeric order: 16 -> 17

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-4 | v1.0 | 6/6 | Complete | 2026-01-28 |
| 5-9 | v1.1 | 10/10 | Complete | 2026-02-02 |
| 10 | v1.2 | 2/2 | Complete | 2026-02-12 |
| 11 | v1.3 | 1/1 | Complete | 2026-02-13 |
| 12-15 | v1.4 | 5/5 | Complete | 2026-02-18 |
| 16 | v1.5 | Complete    | 2026-02-21 | 2026-02-21 |
| 17 | v1.5 | 0/1 | Not started | - |

---
*Roadmap created: 2026-01-28*
*Last updated: 2026-02-21 after Phase 17 planning*
