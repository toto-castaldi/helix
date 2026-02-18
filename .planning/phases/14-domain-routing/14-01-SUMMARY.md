---
phase: 14-domain-routing
plan: 01
subsystem: infra
tags: [nginx, dns, https, certbot, oauth, supabase-auth]

# Dependency graph
requires:
  - phase: 12-landing-build-setup
    provides: dist-landing/ build output and /var/www/helix-landing document root target
  - phase: 13-landing-page-content
    provides: landing.html and assets to serve at helix.toto-castaldi.com
provides:
  - Nginx config for helix.toto-castaldi.com serving landing page from /var/www/helix-landing
  - Nginx config for coach.helix.toto-castaldi.com serving coach app from /var/www/helix
  - Three-domain architecture deployed with HTTPS and Google OAuth on all domains
affects: [15-deploy-pipeline]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Separate Nginx config per domain (one file per virtual host)"
    - "HTTP-to-HTTPS redirect block + HTTPS server block pattern with certbot placeholders"
    - "SPA fallback: try_files $uri $uri/ /index.html pattern"

key-files:
  created:
    - config/nginx-helix-landing.conf
    - config/nginx-helix-coach.conf
  modified: []
  deleted:
    - config/nginx-helix-web.conf

key-decisions:
  - "Three-domain split: landing at root domain, coach on subdomain, live unchanged"
  - "Landing page uses /var/www/helix-landing as document root (separate from coach /var/www/helix)"
  - "nginx-helix-web.conf deleted and replaced by two separate domain-specific configs"

patterns-established:
  - "Nginx config pattern: separate file per virtual host in config/ directory"
  - "SSL managed by certbot with placeholder comments in source config files"

requirements-completed: [DOM-01, DOM-02, DOM-03]

# Metrics
duration: ~30min
completed: 2026-02-18
---

# Phase 14 Plan 01: Domain Routing Summary

**Three-domain Nginx architecture with DNS, HTTPS (certbot), and OAuth redirect URLs deployed — landing at helix.toto-castaldi.com, coach app at coach.helix.toto-castaldi.com**

## Performance

- **Duration:** ~30 min (includes user manual deployment steps)
- **Started:** 2026-02-18
- **Completed:** 2026-02-18
- **Tasks:** 2 (1 auto + 1 checkpoint:human-verify)
- **Files modified:** 3 (2 created, 1 deleted)

## Accomplishments

- Created `nginx-helix-landing.conf` serving helix.toto-castaldi.com from /var/www/helix-landing with SPA fallback to landing.html
- Created `nginx-helix-coach.conf` serving coach.helix.toto-castaldi.com from /var/www/helix with SPA fallback to index.html
- Deleted old `nginx-helix-web.conf` (the root domain config that previously served the coach app)
- User completed full deployment runbook: GoDaddy DNS A record for coach.helix subdomain, Nginx config deploy, certbot HTTPS for both domains, Supabase auth redirect URLs updated, Google OAuth redirect URIs updated

## Task Commits

Each task was committed atomically:

1. **Task 1: Create three-domain Nginx configuration files** - `63ec2a3` (feat)
2. **Task 2: User deploys DNS, Nginx, HTTPS, and auth configuration** - checkpoint:human-verify (no commit - user manual steps)

**Plan metadata:** (this commit)

## Files Created/Modified

- `config/nginx-helix-landing.conf` - Nginx virtual host for helix.toto-castaldi.com, root /var/www/helix-landing, index landing.html, gzip + asset caching, HTTP->HTTPS redirect
- `config/nginx-helix-coach.conf` - Nginx virtual host for coach.helix.toto-castaldi.com, root /var/www/helix, index index.html, gzip + asset caching, HTTP->HTTPS redirect
- `config/nginx-helix-web.conf` - DELETED (replaced by the two new domain-specific configs above)

## Decisions Made

- **Three-domain split:** Landing page stays at root domain (helix.toto-castaldi.com), coach app moves to subdomain (coach.helix.toto-castaldi.com), live tablet app unchanged (live.helix.toto-castaldi.com). Clean separation of concerns per app.
- **Separate document roots:** Landing uses /var/www/helix-landing to isolate the static landing build from the React coach app at /var/www/helix.
- **Certbot placeholders in source:** SSL cert paths are commented out in the config files. Certbot fills them in on the server. This keeps the source files deployable without pre-existing certs.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

The following manual steps were completed by the user during the Task 2 checkpoint:

1. **GoDaddy DNS** - Created A record `coach.helix` pointing to the same droplet IP as helix.toto-castaldi.com
2. **DigitalOcean Droplet (SSH)** - Created /var/www/helix-landing, deployed nginx-helix-landing.conf and nginx-helix-coach.conf, ran certbot for both domains, reloaded Nginx
3. **Supabase Dashboard** - Added https://coach.helix.toto-castaldi.com to Authentication > URL Configuration redirect URLs
4. **Google Cloud Console** - Added https://coach.helix.toto-castaldi.com as authorized JavaScript origin and redirect URI for the OAuth 2.0 client

## Next Phase Readiness

- Three domains fully operational with HTTPS and Google OAuth
- Phase 15 (Deploy Pipeline) can now proceed: GitHub Actions needs updating to build and deploy landing, coach, and live apps to their respective /var/www paths
- The new `/var/www/helix-landing` document root on the server needs to be the deploy target for the landing build (dist-landing/)

---
*Phase: 14-domain-routing*
*Completed: 2026-02-18*
