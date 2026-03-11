# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.7 — Sync Recovery

**Shipped:** 2026-03-11
**Phases:** 3 | **Plans:** 4 | **Tasks:** 8

### What Was Built
- Webhook handler for Docora `sync_failed` events with HMAC validation and DB persistence
- Error display on repository cards with actionable "Aggiorna token" button
- `docora-update-token` Edge Function with Docora PATCH API and sync status reset
- UpdateTokenDialog component with PAT input, loading/error states, realtime recovery

### What Worked
- Small, focused phases (1-2 plans each) executed quickly — average 3 min per plan
- Clean phase dependency chain: ingestion → display → recovery, each building on prior
- Existing patterns (prop-drilling, Edge Function structure, realtime subscriptions) made implementation fast
- Zero deviations from plans across all 4 plans — spec quality was high
- Docora-first fail-fast ordering prevented orphaned DB state on external API failures

### What Was Inefficient
- Phase 24 VALIDATION.md was created but never completed (draft status) — validation overhead for a 2-task phase
- Some duplicate decisions recorded in STATE.md (Phase 24 decisions appeared twice with different prefix formats)

### Patterns Established
- Early branch in webhook for structurally different payloads (check action before parsing body)
- External API call before DB write: validate with external service first, only persist on success
- Card-centered dialog for simple forms (vs full-screen overlay for content browsers)

### Key Lessons
1. 3-phase milestone with clear dependency chain is the sweet spot for focused features — small enough to ship fast, large enough to be meaningful
2. Stub-then-replace pattern (Phase 24 no-op → Phase 25 real handler) keeps phases independently shippable
3. Realtime subscriptions eliminate the need for manual refresh logic — the sync_failed → pending transition "just works"

### Cost Observations
- Model mix: quality profile (opus for planning/verification, sonnet for execution)
- Sessions: ~4 sessions across 5 days
- Notable: 29 commits total, 8 feat commits — low overhead ratio

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Commits | Phases | Key Change |
|-----------|---------|--------|------------|
| v1.7 | 29 | 3 | Focused 3-phase milestone with audit before completion |

### Top Lessons (Verified Across Milestones)

1. Small phases (1-2 plans) execute faster and more accurately than large phases
2. Existing patterns (prop-drilling, Edge Function structure) compound — later milestones are faster
