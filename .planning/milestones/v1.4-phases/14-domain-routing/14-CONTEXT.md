# Phase 14: Domain Routing - Context

**Gathered:** 2026-02-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Configure three-domain architecture so each Helix app is served on its correct domain: helix.toto-castaldi.com (landing), coach.helix.toto-castaldi.com (coach app), live.helix.toto-castaldi.com (live tablet). Includes DNS records, Nginx configs, HTTPS certificates, and auth redirect updates.

</domain>

<decisions>
## Implementation Decisions

### DNS & Subdomain Setup
- DNS managed in GoDaddy
- All three domains point to the same DigitalOcean droplet (same IP)
- coach.helix.toto-castaldi.com DNS record needs to be created manually in GoDaddy
- live.helix.toto-castaldi.com is already fully set up (DNS + Nginx + HTTPS)
- Plan documents exactly what DNS records are needed; user creates them in GoDaddy

### Nginx Routing Strategy
- Currently multiple Nginx config files (separate files for helix and live)
- New separate Nginx config file for coach.helix.toto-castaldi.com
- Nginx config files stored in repo (config/ folder), deployed from there
- HTTPS (certbot/Let's Encrypt) included in this phase, not deferred to Phase 15

### Auth Migration
- Re-login on new coach.helix domain is acceptable (no session preservation needed)
- Need to investigate and update Supabase auth redirect URLs and Google OAuth config (both Supabase Dashboard and Google Cloud Console may need changes)
- MCP endpoint stays on Supabase Edge Functions domain — no change needed
- Env vars (.env.production) stay the same — Supabase URL/key don't change

### Old URL Handling
- helix.toto-castaldi.com serves landing page only — no redirects for old coach app routes
- CTA buttons on landing page are sufficient to guide users to coach.helix subdomain — no temporary banner
- Include a verification checklist of external service URLs that may reference helix.toto-castaldi.com (Docora webhooks, GitHub OAuth callbacks, etc.)

### Claude's Discretion
- Exact Nginx config structure and location conventions
- Certbot invocation strategy (standalone vs webroot vs nginx plugin)
- Order of operations for DNS → Nginx → HTTPS → auth updates

</decisions>

<specifics>
## Specific Ideas

- Live subdomain is already fully working — use its setup as reference for the coach subdomain config
- Config files in a `config/` folder in the repo for version control

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 14-domain-routing*
*Context gathered: 2026-02-18*
