---
phase: 24
slug: error-display
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-11
---

# Phase 24 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — no test framework configured in this project |
| **Config file** | None |
| **Quick run command** | `npm run build` |
| **Full suite command** | `npm run build && npm run lint` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build`
- **After every plan wave:** Run `npm run build && npm run lint`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 24-01-01 | 01 | 1 | DISP-01 | build | `npm run build` | N/A | ⬜ pending |
| 24-01-02 | 01 | 1 | DISP-02 | build | `npm run build` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework installation needed — TypeScript compilation via `npm run build` verifies type correctness of new props and callback wiring.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| sync_failed card shows error message in red box | DISP-01 | Visual UI behavior, no test framework | 1. Set a repository's sync_status to 'sync_failed' with a sync_error_message in DB 2. Open Repositories page 3. Verify red box with error message appears on the card |
| Error card includes "Aggiorna token" button | DISP-02 | Visual UI + click behavior, no test framework | 1. Same setup as DISP-01 2. Verify "Aggiorna token" button appears inside the red box 3. Click button — verify no errors (stub handler) |
| Normal repositories show no error state | DISP-01 | Visual — no false alarms | 1. View repositories with sync_status 'active' 2. Verify no red box or error message appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
