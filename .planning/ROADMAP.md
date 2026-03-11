# Roadmap: Helix

## Milestones

- ✅ **v1.0 Esercizi di Gruppo** — Phases 1-4 (shipped 2026-01-28)
- ✅ **v1.1 Group Exercise Improvements** — Phases 5-9 (shipped 2026-02-02)
- ✅ **v1.2 Lumio Exercise Images** — Phase 10 (shipped 2026-02-12)
- ✅ **v1.3 Image Auto-Play** — Phase 11 (shipped 2026-02-13)
- ✅ **v1.4 Landing Page + Domini** — Phases 12-15 (shipped 2026-02-18)
- ✅ **v1.5 Versioning GSD** — Phases 16-17 (shipped 2026-02-21)
- ✅ **v1.6 MCP Assessment & Fix** — Phases 18-22 (shipped 2026-02-24)
- **v1.7 Sync Recovery** — Phases 23-25 (in progress)

## Phases

<details>
<summary>✅ v1.0 Esercizi di Gruppo (Phases 1-4) — SHIPPED 2026-01-28</summary>

See `.planning/milestones/v1.0-ROADMAP.md` for details.

</details>

<details>
<summary>✅ v1.1 Group Exercise Improvements (Phases 5-9) — SHIPPED 2026-02-02</summary>

See `.planning/milestones/v1.1-ROADMAP.md` for details.

</details>

<details>
<summary>✅ v1.2 Lumio Exercise Images (Phase 10) — SHIPPED 2026-02-12</summary>

See `.planning/milestones/v1.2-ROADMAP.md` for details.

</details>

<details>
<summary>✅ v1.3 Image Auto-Play (Phase 11) — SHIPPED 2026-02-13</summary>

See `.planning/milestones/v1.3-ROADMAP.md` for details.

</details>

<details>
<summary>✅ v1.4 Landing Page + Domini (Phases 12-15) — SHIPPED 2026-02-18</summary>

See `.planning/milestones/v1.4-ROADMAP.md` for details.

</details>

<details>
<summary>✅ v1.5 Versioning GSD (Phases 16-17) — SHIPPED 2026-02-21</summary>

See `.planning/milestones/v1.5-ROADMAP.md` for details.

</details>

<details>
<summary>✅ v1.6 MCP Assessment & Fix (Phases 18-22) — SHIPPED 2026-02-25</summary>

See `.planning/milestones/v1.6-ROADMAP.md` for details.

</details>

### v1.7 Sync Recovery (In Progress)

**Milestone Goal:** Handle Docora sync failures by receiving sync_failed webhooks, showing errors on repository cards, and allowing coaches to update tokens via a dedicated dialog.

- [x] **Phase 23: Failure Ingestion** - Receive and store Docora sync failure events
- [x] **Phase 24: Error Display** - Show sync failure status on repository cards with recovery action (completed 2026-03-11)
- [ ] **Phase 25: Token Recovery** - Update PAT token via dialog, push to Docora, and reset sync status

## Phase Details

### Phase 23: Failure Ingestion
**Goal**: Helix correctly receives, validates, and persists Docora sync failure events so the system knows when a repository sync has failed
**Depends on**: Phase 22 (v1.6 complete)
**Requirements**: HOOK-01, HOOK-02
**Success Criteria** (what must be TRUE):
  1. When Docora sends a sync_failed webhook with valid HMAC signature, Helix accepts it and returns success
  2. After receiving a sync_failed webhook, the repository's sync_status in the database is 'sync_failed' and the error message is stored
  3. Invalid or tampered webhooks are rejected (signature verification works)
**Plans:** 1/1 plans complete
Plans:
- [x] 23-01-PLAN.md — Webhook handler, database migration, and type updates for sync_failed ingestion

### Phase 24: Error Display
**Goal**: Coaches can see at a glance which repositories have sync failures and have a clear path to fix them
**Depends on**: Phase 23
**Requirements**: DISP-01, DISP-02
**Success Criteria** (what must be TRUE):
  1. When a repository has sync_status 'sync_failed', its card on the Repositories page shows a visible error message
  2. The error card includes an "Update token" button that is clearly actionable
  3. Repositories with normal sync status show no error state (no false alarms)
**Plans:** 1/1 plans complete
Plans:
- [x] 24-01-PLAN.md — Error display on RepositoryCard with "Aggiorna token" button and callback wiring

### Phase 25: Token Recovery
**Goal**: Coaches can resolve sync failures by updating their PAT token through a focused dialog, which updates both Helix and Docora and resets the sync pipeline
**Depends on**: Phase 24
**Requirements**: TOKN-01, TOKN-02, TOKN-03, TOKN-04
**Success Criteria** (what must be TRUE):
  1. Clicking "Update token" opens a focused dialog with a PAT input field
  2. After submitting a new token, it is saved to the Helix database (encrypted)
  3. The token update is pushed to Docora via their PATCH API
  4. After successful update, the repository's sync_status resets to 'pending' and Docora auto-retries sync
  5. The error state on the repository card disappears after successful token update
**Plans:** 1/2 plans complete
Plans:
- [x] 25-01-PLAN.md — Edge Function for token update (Docora PATCH API + DB update + sync reset)
- [ ] 25-02-PLAN.md — UpdateTokenDialog component + wiring into Repositories page

## Progress

**Execution Order:**
Phases execute in numeric order: 23 -> 24 -> 25

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-4 | v1.0 | 6/6 | Complete | 2026-01-28 |
| 5-9 | v1.1 | 10/10 | Complete | 2026-02-02 |
| 10 | v1.2 | 2/2 | Complete | 2026-02-12 |
| 11 | v1.3 | 1/1 | Complete | 2026-02-13 |
| 12-15 | v1.4 | 5/5 | Complete | 2026-02-18 |
| 16-17 | v1.5 | 2/2 | Complete | 2026-02-21 |
| 18-22 | v1.6 | 9/9 | Complete | 2026-02-25 |
| 23. Failure Ingestion | v1.7 | Complete    | 2026-03-06 | 2026-03-06 |
| 24. Error Display | 1/1 | Complete    | 2026-03-11 | - |
| 25. Token Recovery | v1.7 | 1/2 | In progress | - |

---
*Roadmap created: 2026-01-28*
*Last updated: 2026-03-11 -- Phase 25 plan 01 complete*
