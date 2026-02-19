---
phase: 15-deploy-pipeline
plan: 02
subsystem: infra
tags: [ssl, certbot, https, letsencrypt, nginx, deploy, server-setup]

# Dependency graph
requires:
  - phase: 15-deploy-pipeline
    plan: 01
    provides: Three-app CI/CD pipeline with cert-aware Nginx config sync
  - phase: 14-domain-routing
    provides: Nginx config files for three-domain architecture
provides:
  - Server prerequisites configured (sudo permissions for deploy user)
  - /var/www/helix-landing directory created and owned by deploy user
  - DEPLOY_PATH_LANDING GitHub secret configured
  - Let's Encrypt SSL certificates for helix.toto-castaldi.com and coach.helix.toto-castaldi.com
  - Certbot auto-renewal configured for both new domains
  - Full end-to-end pipeline verified (push to main deploys all three apps with HTTPS)
affects: []

# Tech tracking
tech-stack:
  added: [certbot, letsencrypt]
  patterns: [certbot-auto-renewal, sudoers-deploy-permissions]

key-files:
  created: []
  modified: []

key-decisions:
  - "Certbot provisioned directly on server via --nginx plugin for automatic Nginx integration"
  - "SSL certificates regenerated to cover all three domains after initial HTTP-only deploy"
  - "Deploy user configured with passwordless sudo for nginx, systemctl, cp, ln, sed"

patterns-established:
  - "SSL renewal: certbot auto-renewal handles certificate lifecycle on server"
  - "Pipeline cert-awareness: deploy.yml detects certs and enables SSL lines automatically"

requirements-completed: [INFRA-01, INFRA-02, INFRA-03]

# Metrics
duration: ~30min
completed: 2026-02-18
---

# Phase 15 Plan 02: SSL & Server Setup Summary

**Server provisioned with sudo permissions, landing directory, GitHub secret, and Let's Encrypt HTTPS certificates for all three Helix domains via certbot**

## Performance

- **Duration:** ~30 min (human-action checkpoint with server SSH and certbot provisioning)
- **Started:** 2026-02-18T16:00:00Z
- **Completed:** 2026-02-18T16:14:45Z
- **Tasks:** 1 (human-action checkpoint)
- **Files modified:** 0 (all changes on server and GitHub UI)

## Accomplishments
- Server deploy user configured with passwordless sudo for Nginx operations (nginx, systemctl, cp, ln, sed)
- Created /var/www/helix-landing directory with correct ownership for landing page deployment
- Added DEPLOY_PATH_LANDING GitHub secret for pipeline integration
- Provisioned Let's Encrypt SSL certificates via certbot for helix.toto-castaldi.com and coach.helix.toto-castaldi.com
- Verified all three domains serve correct content over HTTPS:
  - https://helix.toto-castaldi.com -- landing page
  - https://coach.helix.toto-castaldi.com -- coach app
  - https://live.helix.toto-castaldi.com -- live tablet app
- Certbot auto-renewal configured for ongoing certificate management

## Task Commits

This plan consisted of a single human-action checkpoint (server SSH + GitHub UI). No code commits were produced.

1. **Task 1: Server prerequisites, certbot SSL provisioning, GitHub secret, and full pipeline verification** - Human-action (no commit)

**Plan metadata:** (pending -- this summary commit)

## Files Created/Modified
- None (all changes were server-side: sudoers config, directory creation, certbot certificates, GitHub secret)

## Decisions Made
- Certbot provisioned using the --nginx plugin for automatic Nginx SSL integration
- SSL certificates regenerated after initial HTTP-only deploy to cover both new domains
- Deploy user sudo configured via /etc/sudoers.d/helix-deploy for security isolation

## Deviations from Plan

None - plan executed exactly as written. User completed all six steps in sequence.

## Issues Encountered
None - certbot provisioning and pipeline verification succeeded on first attempt.

## User Setup Required

All setup completed during this plan:
- [x] Server sudo permissions for deploy user
- [x] /var/www/helix-landing directory created
- [x] DEPLOY_PATH_LANDING GitHub secret added
- [x] Certbot SSL certificates provisioned
- [x] Full pipeline verified end-to-end

## Next Phase Readiness
- v1.4 Landing Page + Domini milestone is complete
- All three Helix domains operational with automated CI/CD and valid HTTPS
- No further phases planned -- ready for next milestone definition

## Self-Check: PASSED

- [x] `15-02-SUMMARY.md` exists
- [x] `15-02-PLAN.md` exists
- [x] `15-01-SUMMARY.md` exists (dependency)

---
*Phase: 15-deploy-pipeline*
*Completed: 2026-02-18*
