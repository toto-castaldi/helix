---
phase: 12-landing-build-setup
plan: 01
subsystem: infra
tags: [vite, tailwindcss, multi-entry, landing-page, vanilla-js]

# Dependency graph
requires: []
provides:
  - "Third Vite entry point (landing.html) for static landing page"
  - "Vite config (vite.config.landing.ts) with Tailwind CSS, no React/PWA"
  - "npm scripts: dev:landing (5175), build:landing, preview:landing"
  - "public-landing/ directory with logo assets"
  - "Helix brand CSS custom properties (--helix-amber, --helix-coral, --helix-violet)"
affects: [13-landing-content, 14-domain-deploy, 15-domain-finalize]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Multi-entry Vite pattern extended to third app (landing)"]

key-files:
  created:
    - landing.html
    - vite.config.landing.ts
    - src/landing/main.ts
    - src/landing/style.css
    - public-landing/logo.svg
    - public-landing/logo-circle.svg
  modified:
    - package.json

key-decisions:
  - "Landing page uses vanilla JS (no React) for simplicity and performance"
  - "No PWA configuration for landing page (public-facing marketing page)"
  - "Port 5175 for landing dev server (5173=coach, 5174=live, 5175=landing)"
  - "No tsc -b prefix for build:landing (no React/JSX to type-check)"

patterns-established:
  - "Landing entry point pattern: landing.html + vite.config.landing.ts + src/landing/ + public-landing/"
  - "Brand CSS variables: --helix-amber, --helix-coral, --helix-violet"

requirements-completed: [LAND-05]

# Metrics
duration: 2min
completed: 2026-02-18
---

# Phase 12 Plan 01: Landing Build Setup Summary

**Third Vite entry point for landing page with vanilla JS + Tailwind CSS, independent build to dist-landing/, port 5175 dev server**

## Performance

- **Duration:** 2 min 33s
- **Started:** 2026-02-18T11:20:50Z
- **Completed:** 2026-02-18T11:23:23Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Created landing.html as third Vite entry point (English lang, no PWA, no React)
- Built vite.config.landing.ts following established live app pattern (simplified)
- Added 4 npm scripts (dev:landing, dev:landing:clean, build:landing, preview:landing)
- Verified all three apps build independently without cross-contamination

## Task Commits

Each task was committed atomically:

1. **Task 1: Create landing page entry point, Vite config, and assets** - `613ddb8` (feat)
2. **Task 2: Add npm scripts and verify all three entry points work** - `29e0c45` (feat)

## Files Created/Modified
- `landing.html` - Third Vite entry point (lang="en", no PWA meta tags)
- `vite.config.landing.ts` - Vite config with tailwindcss plugin, landingHtmlPlugin middleware, public-landing dir, dist-landing output
- `src/landing/main.ts` - Vanilla JS entry with branded stub page (gradient h1, logo, tagline)
- `src/landing/style.css` - Tailwind CSS import + Helix brand color CSS custom properties
- `public-landing/logo.svg` - Logo asset copied from public/
- `public-landing/logo-circle.svg` - Favicon asset copied from public/
- `package.json` - Added dev:landing, dev:landing:clean, build:landing, preview:landing scripts

## Decisions Made
- Used vanilla JS (no React) for landing page per user decision -- simpler, faster, no framework overhead
- No PWA configuration (no manifest, no service worker, no apple-touch-icon)
- Port 5175 for dev server, following sequential pattern (5173, 5174, 5175)
- No tsc -b prefix for build:landing since there is no React/JSX to type-check
- Used `div#app` instead of `div#root` to distinguish from React apps

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Build infrastructure complete, ready for Phase 13 (Landing Content) to build actual page content
- Brand CSS variables (--helix-amber, --helix-coral, --helix-violet) ready for use in content
- Stub page provides visual confirmation that the build pipeline works end-to-end

## Self-Check: PASSED

All 6 created files verified present. Both task commits (613ddb8, 29e0c45) verified in git log.

---
*Phase: 12-landing-build-setup*
*Completed: 2026-02-18*
