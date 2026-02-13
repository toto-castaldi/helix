# Roadmap: Helix

## Milestones

- v1.0 Esercizi di Gruppo - Phases 1-4 (shipped 2026-01-28)
- v1.1 Group Exercise Improvements - Phases 5-9 (shipped 2026-02-02)
- v1.2 Lumio Exercise Images - Phase 10 (shipped 2026-02-12)
- v1.3 Image Auto-Play - Phase 11 (shipped 2026-02-13)

## Phases

<details>
<summary>v1.0 Esercizi di Gruppo (Phases 1-4) - SHIPPED 2026-01-28</summary>

See `.planning/milestones/v1.0-ROADMAP.md` for details.

</details>

<details>
<summary>v1.1 Group Exercise Improvements (Phases 5-9) - SHIPPED 2026-02-02</summary>

See `.planning/milestones/v1.1-ROADMAP.md` for details.

</details>

<details>
<summary>v1.2 Lumio Exercise Images (Phase 10) - SHIPPED 2026-02-12</summary>

See `.planning/milestones/v1.2-ROADMAP.md` for details.

</details>

### v1.3 Image Auto-Play (Complete)

**Milestone Goal:** Add automatic slideshow to the existing ImageGallery component so coaches can watch exercise images cycle hands-free during live sessions.

- [x] **Phase 11: Image Auto-Play Slideshow** - Tap-to-play automatic image cycling with visual feedback and gesture integration

#### Phase 11: Image Auto-Play Slideshow

**Goal**: Coach can start and stop an automatic slideshow of exercise images on the live tablet, with clear visual feedback and seamless interaction with existing swipe navigation
**Depends on**: Phase 10 (ImageGallery component exists with swipe support)
**Requirements**: IMGAP-01, IMGAP-02, IMGAP-03, IMGAP-04, IMGAP-05
**Success Criteria** (what must be TRUE):
  1. Coach taps an exercise image that has multiple Lumio images and the images cycle automatically every 3 seconds, looping back to the first after the last
  2. Coach taps the image again while the slideshow is playing and it stops on the current image
  3. A play/pause icon overlay is visible on the image indicating whether the slideshow is active or paused
  4. Coach swipes manually during active auto-play and the slideshow stops automatically
  5. Exercises with a single Lumio image or no images show no auto-play affordance and behave exactly as before
**Plans**: 1 plan

Plans:
- [x] 11-01-PLAN.md -- Auto-play slideshow with play/pause overlay, amber glow, and gesture integration

## Progress

**Execution Order:** Phase 11

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-4 | v1.0 | 6/6 | Complete | 2026-01-28 |
| 5-9 | v1.1 | 10/10 | Complete | 2026-02-02 |
| 10 | v1.2 | 2/2 | Complete | 2026-02-12 |
| 11. Image Auto-Play Slideshow | v1.3 | 1/1 | Complete | 2026-02-13 |

---
*Roadmap created: 2026-02-12*
*Last updated: 2026-02-13*
