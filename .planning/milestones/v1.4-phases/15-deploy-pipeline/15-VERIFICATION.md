---
phase: 15-deploy-pipeline
verified: 2026-02-18T18:00:00Z
status: human_needed
score: 7/9 must-haves verified (2 require human/runtime confirmation)
human_verification:
  - test: "Push to main deploys all three apps without manual intervention"
    expected: "GitHub Actions workflow completes with all steps green including Build landing app, Deploy landing app, Deploy Nginx configs, Apply Nginx configs and reload"
    why_human: "Cannot run GitHub Actions workflow programmatically; runtime behavior of the CI/CD system requires actual push and observation"
  - test: "All three domains serve correct content over HTTPS"
    expected: "https://helix.toto-castaldi.com shows landing page, https://coach.helix.toto-castaldi.com shows coach app, https://live.helix.toto-castaldi.com shows live tablet app — all with valid HTTPS (no browser cert warnings)"
    why_human: "Server-side state (certbot certs, nginx running state, DNS resolution) cannot be verified from the codebase; requires browser or curl against live domains"
---

# Phase 15: Deploy Pipeline Verification Report

**Phase Goal:** All three apps build, deploy, and serve over HTTPS automatically on every push to main
**Verified:** 2026-02-18T18:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth                                                                              | Status      | Evidence                                                                                         |
|----|------------------------------------------------------------------------------------|-------------|--------------------------------------------------------------------------------------------------|
| 1  | deploy.yml contains a "Build landing app" step that runs npm run build:landing     | VERIFIED  | Line 67-70 of deploy.yml: step name "Build landing app", run: `npm run build:landing`           |
| 2  | deploy.yml contains "Deploy landing app to server" step using DEPLOY_PATH_LANDING  | VERIFIED  | Lines 92-100: ssh-deploy action, TARGET: `${{ secrets.DEPLOY_PATH_LANDING }}`, SOURCE: dist-landing/ |
| 3  | deploy.yml syncs config/ Nginx files to server and conditionally reloads Nginx     | VERIFIED  | Lines 102-157: "Deploy Nginx configs to server" + "Apply Nginx configs and reload" steps both present |
| 4  | Nginx apply step checks for SSL cert existence before nginx -t                     | VERIFIED  | Line 134-135: `CERT_PATH="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"` / `if [ ! -f "$CERT_PATH" ]` |
| 5  | Coach and live app build/deploy steps are unchanged                                | VERIFIED  | Lines 53-90: Build main app, Build live app, Deploy main app, Deploy live app all present and unmodified |
| 6  | Landing build omits Supabase env vars                                              | VERIFIED  | Lines 67-71: Build landing step only has VITE_APP_VERSION env var, no VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY |
| 7  | Live Nginx config excluded from pipeline copy                                      | VERIFIED  | nginx-helix-live.conf not referenced anywhere in deploy.yml; only landing and coach are cp'd    |
| 8  | Push to main builds and deploys all three apps without manual intervention         | ? HUMAN   | Pipeline code is correct; runtime success requires actual push and GitHub Actions observation   |
| 9  | All three domains serve correct content over HTTPS                                 | ? HUMAN   | Server-side state (certs, nginx config, DNS) cannot be verified from codebase                  |

**Score:** 7/9 truths verified (2 require human runtime verification)

### Required Artifacts

| Artifact                              | Expected                                    | Status     | Details                                                                             |
|---------------------------------------|---------------------------------------------|------------|-------------------------------------------------------------------------------------|
| `.github/workflows/deploy.yml`        | Three-app build/deploy + Nginx sync         | VERIFIED | 200 lines, YAML valid (confirmed by python3 yaml.safe_load), all required steps present |
| `config/nginx-helix-landing.conf`     | Nginx config for helix.toto-castaldi.com    | VERIFIED | 35 lines, listens 80+443, server_name helix.toto-castaldi.com, root /var/www/helix-landing |
| `config/nginx-helix-coach.conf`       | Nginx config for coach.helix.toto-castaldi.com | VERIFIED | 35 lines, listens 80+443, server_name coach.helix.toto-castaldi.com, root /var/www/helix |
| `vite.config.landing.ts`              | Vite config for landing build               | VERIFIED | File exists at project root                                                         |
| `landing.html`                        | Landing page entry point                    | VERIFIED | File exists at project root                                                         |

### Key Link Verification

| From                                | To                             | Via                              | Status     | Details                                                                                 |
|-------------------------------------|--------------------------------|----------------------------------|------------|-----------------------------------------------------------------------------------------|
| `.github/workflows/deploy.yml`      | `dist-landing/`                | `npm run build:landing` step     | WIRED    | Line 67-70: step runs build:landing; line 98: SOURCE: dist-landing/ in deploy step     |
| `.github/workflows/deploy.yml`      | `DEPLOY_PATH_LANDING` secret   | ssh-deploy action                | WIRED    | Line 99: `TARGET: ${{ secrets.DEPLOY_PATH_LANDING }}`                                  |
| `.github/workflows/deploy.yml`      | `/etc/nginx/sites-available/`  | ssh-action config copy step      | WIRED    | Lines 121-122: `sudo cp /tmp/helix-nginx-config/nginx-helix-*.conf /etc/nginx/sites-available/` |
| `package.json build:landing`        | `vite.config.landing.ts`       | vite build --config flag         | WIRED    | Line 15 of package.json: `"build:landing": "vite build --config vite.config.landing.ts"` |

### Requirements Coverage

| Requirement | Source Plan      | Description                                                              | Status       | Evidence                                                                                          |
|-------------|-----------------|--------------------------------------------------------------------------|--------------|---------------------------------------------------------------------------------------------------|
| INFRA-01    | 15-01, 15-02    | GitHub Actions updated to build and deploy landing + coach on separate domains | VERIFIED   | deploy.yml has Build/Deploy landing step and Build/Deploy main (coach) step with separate secrets |
| INFRA-02    | 15-01, 15-02    | Nginx configuration for three domains (landing, coach, live)             | VERIFIED   | config/ contains nginx-helix-landing.conf, nginx-helix-coach.conf, nginx-helix-live.conf         |
| INFRA-03    | 15-02           | HTTPS certificates for coach.helix.toto-castaldi.com                    | ? HUMAN    | Certbot provisioning is a server-side runtime action; SUMMARY claims completion but cannot verify from codebase |

**Coverage notes:**
- All three INFRA requirement IDs (INFRA-01, INFRA-02, INFRA-03) appear in the phase plans and REQUIREMENTS.md — no orphaned requirements.
- INFRA-03 is inherently a server-side operation (certbot SSL cert provisioning); the pipeline has correct cert-aware logic that will activate SSL once certs are present. The SUMMARY documents completion by the human operator.

### Anti-Patterns Found

| File                               | Line | Pattern                        | Severity | Impact                                                                       |
|------------------------------------|------|--------------------------------|----------|------------------------------------------------------------------------------|
| `config/nginx-helix-live.conf`     | 15-17 | `...` SSL placeholder lines   | INFO     | Intentional — live config managed separately on server; excluded from pipeline sync by design |
| `15-01-SUMMARY.md`                 | 67   | Commit hash `1c35164` mismatch | INFO     | SUMMARY documents hash `1c35164` but actual implementation commit is `ebd11a1`; content matches, documentation discrepancy only |

No blockers. No warnings. One INFO-level note on intentional live config placeholder (design decision documented in key-decisions), and one documentation-only hash mismatch in the SUMMARY.

### Human Verification Required

#### 1. End-to-End Pipeline Run

**Test:** Push any commit to main and observe the GitHub Actions workflow run at https://github.com/{owner}/helix/actions
**Expected:** All 20 steps complete successfully. Specifically: "Build landing app" passes, "Deploy landing app to server" passes, "Deploy Nginx configs to server" passes, "Apply Nginx configs and reload" passes (logging "SSL cert found for helix.toto-castaldi.com" since certbot should be provisioned)
**Why human:** GitHub Actions workflow execution is a runtime CI/CD event that cannot be triggered or observed programmatically from the local codebase

#### 2. HTTPS Verification for All Three Domains

**Test:** Visit each domain in a browser or via `curl -I`:
- `https://helix.toto-castaldi.com`
- `https://coach.helix.toto-castaldi.com`
- `https://live.helix.toto-castaldi.com`

Also test HTTP redirect:
- `http://helix.toto-castaldi.com` (should 301 → https://)
- `http://coach.helix.toto-castaldi.com` (should 301 → https://)

**Expected:** All HTTPS URLs return 200 with valid certificates (no browser warnings). HTTP URLs return 301 to HTTPS. Landing page shows Helix landing content. Coach URL shows coach login. Live URL shows live tablet app.
**Why human:** Server-side state — certbot provisioned certs, Nginx running configuration, DNS records — cannot be read from the repository

#### 3. INFRA-03 Certificate Validity for coach.helix.toto-castaldi.com

**Test:** On server: `sudo certbot certificates | grep -A3 "coach.helix.toto-castaldi.com"`
**Expected:** Valid certificate shown with expiry date in the future and auto-renewal enabled
**Why human:** Certbot state exists only on the production server

### Gaps Summary

No automated gaps found. The pipeline code in `.github/workflows/deploy.yml` is complete, correct, and wired:

- All three apps build in sequence (main, live, landing) before any deploy step
- All three apps deploy to their respective server paths via dedicated ssh-deploy steps
- Nginx configs are synced from `config/` to the server with cert-aware SSL handling
- The `#NOSSL#` marker disables 443 blocks pre-certbot; SSL uncomment logic activates post-certbot
- Live Nginx config is correctly excluded from the sync (uses placeholder SSL lines)
- Landing build correctly omits Supabase env vars
- YAML is valid and all 20 steps are in the correct order per the plan specification

The two human-needed items are inherently runtime/server-side verifications that the SUMMARY documents as completed by the human operator during Plan 15-02 execution.

---

_Verified: 2026-02-18T18:00:00Z_
_Verifier: Claude (gsd-verifier)_
