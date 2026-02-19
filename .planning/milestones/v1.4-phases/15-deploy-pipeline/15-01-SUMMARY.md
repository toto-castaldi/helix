---
phase: 15-deploy-pipeline
plan: 01
subsystem: infra
tags: [github-actions, ci-cd, nginx, ssl, deploy]

# Dependency graph
requires:
  - phase: 14-domain-routing
    provides: Nginx config files for landing and coach domains
  - phase: 12-landing-build
    provides: npm run build:landing script producing dist-landing/
provides:
  - Three-app build pipeline (coach, live, landing) in single CI/CD workflow
  - Automated Nginx config sync with cert-aware SSL handling
  - DEPLOY_PATH_LANDING secret integration for landing page deployment
affects: [15-02-ssl-certs]

# Tech tracking
tech-stack:
  added: [appleboy/ssh-action@v1]
  patterns: [cert-aware-nginx-reload, three-app-pipeline]

key-files:
  created: []
  modified: [.github/workflows/deploy.yml]

key-decisions:
  - "Build steps grouped before deploy steps (build all 3 apps, then deploy all 3)"
  - "Nginx live config excluded from sync (managed separately on server to avoid breaking existing SSL)"
  - "Cert-aware approach: disable 443 block when certs missing, enable SSL lines when certs present"

patterns-established:
  - "Cert-aware Nginx deploy: check /etc/letsencrypt/live/$DOMAIN/fullchain.pem before enabling SSL"
  - "Config sync via temp path: rsync to /tmp/ then cp to /etc/nginx/"

requirements-completed: [INFRA-01, INFRA-02]

# Metrics
duration: 2min
completed: 2026-02-18
---

# Phase 15 Plan 01: Deploy Pipeline Summary

**Three-app CI/CD pipeline with landing build/deploy, Nginx config sync, and cert-aware SSL handling for pre/post-certbot states**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-18T15:58:37Z
- **Completed:** 2026-02-18T16:00:27Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Extended deploy.yml from 2-app to 3-app pipeline (coach, live, landing)
- Added cert-aware Nginx config sync that handles both pre-certbot (HTTP-only) and post-certbot (full SSL) states
- Landing build step correctly omits Supabase env vars (static vanilla JS page)
- Live Nginx config excluded from sync to protect existing production SSL setup

## Task Commits

Each task was committed atomically:

1. **Task 1: Add landing build/deploy and cert-aware Nginx sync** - `1c35164` (feat)

**Plan metadata:** `ff25fba` (docs: complete plan)

## Files Created/Modified
- `.github/workflows/deploy.yml` - Added 4 new steps: Build landing app, Deploy landing app, Deploy Nginx configs, Apply Nginx configs and reload

## Decisions Made
- Build steps grouped before deploy steps (build all 3 apps, then deploy all 3) for cleaner pipeline flow
- Nginx live config excluded from sync because it uses placeholder SSL directives that would break the existing live site
- Cert-aware approach uses sed to comment out 443 blocks when certs are missing, and uncomment SSL certificate directives when certs are present

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

GitHub Actions secret `DEPLOY_PATH_LANDING` must be added with value `/var/www/helix-landing` before the pipeline will deploy the landing page successfully.

## Next Phase Readiness
- Pipeline ready to deploy all three apps on next push to main
- Plan 15-02 (SSL/Certbot setup) can proceed -- the cert-aware logic in the pipeline will automatically enable SSL once certbot provisions certificates

## Self-Check: PASSED

- [x] `.github/workflows/deploy.yml` exists
- [x] `15-01-SUMMARY.md` exists
- [x] Commit `1c35164` exists in git history

---
*Phase: 15-deploy-pipeline*
*Completed: 2026-02-18*
