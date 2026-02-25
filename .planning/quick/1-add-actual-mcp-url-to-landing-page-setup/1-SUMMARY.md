---
phase: quick-1
plan: 01
subsystem: ui
tags: [landing-page, mcp, vite, ci]

# Dependency graph
requires:
  - phase: 22-e2e-testing-documentation
    provides: MCP server and landing page already deployed
provides:
  - Dynamic MCP URL in landing page derived from VITE_SUPABASE_URL
  - CI passes VITE_SUPABASE_URL to landing build step
affects: [landing-page, deploy-pipeline]

# Tech tracking
tech-stack:
  added: []
  patterns: [vite-env-var-injection-for-landing]

key-files:
  created: []
  modified:
    - src/landing/main.ts
    - .github/workflows/deploy.yml

key-decisions:
  - "Graceful fallback: MCP_URL falls back to placeholder string if VITE_SUPABASE_URL is missing (local dev without .env)"

patterns-established:
  - "Landing page env vars: pass VITE_SUPABASE_URL to landing build in CI, same as main and live apps"

requirements-completed: [QUICK-1]

# Metrics
duration: 1min
completed: 2026-02-25
---

# Quick Task 1: Add Actual MCP URL to Landing Page Setup Summary

**Landing page MCP setup section now shows the real production endpoint URL derived from VITE_SUPABASE_URL at build time, making the claude mcp add command copy-pasteable**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-25T09:05:03Z
- **Completed:** 2026-02-25T09:06:10Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Landing page MCP command now contains the actual production MCP endpoint URL
- Coaches only need to replace YOUR_API_KEY (the URL is pre-filled)
- CI pipeline updated to pass VITE_SUPABASE_URL to landing build step
- Graceful fallback to placeholder when env var is missing (local dev)

## Task Commits

Each task was committed atomically:

1. **Task 1: Pass VITE_SUPABASE_URL to landing build and replace MCP URL placeholder** - `6ce7817` (feat)

**Plan metadata:** pending (docs: complete quick task 1)

## Files Created/Modified
- `src/landing/main.ts` - Added SUPABASE_URL/MCP_URL constants, updated mcpCommand templates for IT/EN to use dynamic URL, updated mcpNote to reference only API key
- `.github/workflows/deploy.yml` - Added VITE_SUPABASE_URL env var to "Build landing app" step

## Decisions Made
- Used graceful fallback pattern: `SUPABASE_URL ? ... : 'YOUR_HELIX_MCP_URL'` so local dev without .env still shows a recognizable placeholder rather than an empty/broken URL

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - VITE_SUPABASE_URL secret already exists in GitHub Actions (used by main and live app builds). No new secrets needed.

## Next Steps
- Landing page will show real MCP URL on next deploy to production
- No further action required

## Self-Check: PASSED

- FOUND: src/landing/main.ts
- FOUND: .github/workflows/deploy.yml
- FOUND: commit 6ce7817
- FOUND: 1-SUMMARY.md

---
*Quick Task: 1-add-actual-mcp-url-to-landing-page-setup*
*Completed: 2026-02-25*
