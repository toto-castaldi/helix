---
phase: 14-domain-routing
verified: 2026-02-18T00:00:00Z
status: passed
score: 5/5 must-haves verified
re_verification: false
---

# Phase 14: Domain Routing Verification Report

**Phase Goal:** Each Helix application is served on its correct domain with proper separation
**Verified:** 2026-02-18
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth                                                                         | Status     | Evidence                                                                 |
|----|-------------------------------------------------------------------------------|------------|--------------------------------------------------------------------------|
| 1  | helix.toto-castaldi.com serves the landing page (dist-landing)               | VERIFIED   | `nginx-helix-landing.conf`: server_name + root /var/www/helix-landing + index landing.html |
| 2  | coach.helix.toto-castaldi.com serves the coach app                           | VERIFIED   | `nginx-helix-coach.conf`: server_name + root /var/www/helix + index index.html |
| 3  | live.helix.toto-castaldi.com continues to serve the live tablet app unchanged | VERIFIED   | `nginx-helix-live.conf` not touched in phase 14 commit fbe7035; server_name + root /var/www/helix-live confirmed |
| 4  | All three domains have valid HTTPS certificates                               | VERIFIED   | User confirmed deployment; certbot placeholder pattern in source is correct by design — certbot fills in cert paths on server |
| 5  | Google OAuth login works on coach.helix.toto-castaldi.com                    | VERIFIED   | User confirmed during Task 2 checkpoint; Supabase + Google Cloud Console updated per runbook |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact                            | Expected                                                                 | Status   | Details                                                              |
|-------------------------------------|--------------------------------------------------------------------------|----------|----------------------------------------------------------------------|
| `config/nginx-helix-landing.conf`   | Nginx config for helix.toto-castaldi.com serving landing page            | VERIFIED | EXISTS, 36 lines, contains server_name + root /var/www/helix-landing + try_files landing.html |
| `config/nginx-helix-coach.conf`     | Nginx config for coach.helix.toto-castaldi.com serving coach app         | VERIFIED | EXISTS, 36 lines, contains server_name + root /var/www/helix + try_files index.html |
| `config/nginx-helix-live.conf`      | Existing config for live.helix.toto-castaldi.com (unchanged)             | VERIFIED | EXISTS, unchanged from pre-phase; server_name live.helix + root /var/www/helix-live |
| `config/nginx-helix-web.conf`       | DELETED (replaced by landing + coach configs)                            | VERIFIED | File does not exist in repo; removed in commit fbe7035              |

### Key Link Verification

| From                              | To                       | Via              | Status   | Details                                                     |
|-----------------------------------|--------------------------|------------------|----------|-------------------------------------------------------------|
| `config/nginx-helix-landing.conf` | `/var/www/helix-landing` | root directive   | WIRED    | `root /var/www/helix-landing;` present on line 11          |
| `config/nginx-helix-coach.conf`   | `/var/www/helix`         | root directive   | WIRED    | `root /var/www/helix;` present on line 11                  |
| `dist-landing/landing.html`       | `nginx-helix-landing.conf` | index directive | WIRED    | `index landing.html;` matches `dist-landing/landing.html` build output |

### Requirements Coverage

| Requirement | Source Plan | Description                                          | Status    | Evidence                                                        |
|-------------|-------------|------------------------------------------------------|-----------|-----------------------------------------------------------------|
| DOM-01      | 14-01-PLAN  | Coach app servita su coach.helix.toto-castaldi.com   | SATISFIED | `nginx-helix-coach.conf` with server_name + correct root        |
| DOM-02      | 14-01-PLAN  | Landing page servita su helix.toto-castaldi.com      | SATISFIED | `nginx-helix-landing.conf` with server_name + correct root      |
| DOM-03      | 14-01-PLAN  | Live app resta su live.helix.toto-castaldi.com       | SATISFIED | `nginx-helix-live.conf` unchanged, confirmed serving live app   |

**Note:** REQUIREMENTS.md still shows DOM-01/DOM-02/DOM-03 as `Pending` (checkboxes unchecked, traceability column shows "Pending"). The implementation is complete and user-confirmed deployed. The requirements file was not updated as part of this phase — this is a documentation gap, not a code or deployment gap.

### Anti-Patterns Found

| File                              | Line  | Pattern             | Severity | Impact                                                                                  |
|-----------------------------------|-------|---------------------|----------|-----------------------------------------------------------------------------------------|
| `config/nginx-helix-live.conf`    | 15-17 | `...` placeholder lines in SSL section | Info | Pre-existing in the reference file (not created in this phase); certbot manages SSL on server; does not affect routing or goal |

### Human Verification Required

No additional human verification required beyond what was already completed during the Task 2 checkpoint.

The following was confirmed by the user during phase execution:
- All three domains accessible via HTTPS
- Google OAuth works on coach.helix.toto-castaldi.com
- Landing page visible at helix.toto-castaldi.com
- Coach app visible at coach.helix.toto-castaldi.com

### Gaps Summary

No gaps. All must-haves verified.

The three Nginx config files exist, are substantive, and correctly wire each domain to its document root:

- `nginx-helix-landing.conf` routes helix.toto-castaldi.com to /var/www/helix-landing with landing.html as entry
- `nginx-helix-coach.conf` routes coach.helix.toto-castaldi.com to /var/www/helix with index.html SPA fallback
- `nginx-helix-live.conf` remains unchanged for live.helix.toto-castaldi.com
- The old `nginx-helix-web.conf` is deleted, eliminating the old conflicting root-domain config

The only open item is cosmetic: REQUIREMENTS.md checkbox status and traceability column were not updated to reflect completion of DOM-01/02/03. This does not block phase 14's goal or phase 15's readiness.

---

_Verified: 2026-02-18_
_Verifier: Claude (gsd-verifier)_
