# Requirements: Helix

**Defined:** 2026-02-27
**Core Value:** During group lessons, the coach can manage shared exercises from a single view, completing them once for all participants

## v1.7 Requirements

Requirements for milestone v1.7 Sync Recovery. Each maps to roadmap phases.

### Webhook Handling

- [ ] **HOOK-01**: Helix receives and validates Docora `sync_failed` webhook with HMAC signature
- [ ] **HOOK-02**: Sync failure updates repository status to 'sync_failed' with error message stored

### Error Display

- [ ] **DISP-01**: Repository card shows simple error message when sync status is 'sync_failed'
- [ ] **DISP-02**: Error state includes "Update token" action button on the repository card

### Token Recovery

- [ ] **TOKN-01**: "Update token" button opens a focused dialog with PAT input field
- [ ] **TOKN-02**: Token update saves new token to Helix database (encrypted)
- [ ] **TOKN-03**: Token update calls Docora PATCH API to update token on their side
- [ ] **TOKN-04**: After successful update, sync status resets to 'pending' (Docora auto-retries)

## Future Requirements

None deferred for this milestone.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Global notification banner for sync failures | Coach manages repos from Repositories page -- card-level display sufficient |
| Circuit breaker details display | Too technical for coaches -- simple message + action is better UX |
| Manual re-sync button | Docora auto-retries after cooldown -- no need for manual trigger |
| Other error types beyond token expiry | sync_failed webhook covers all git failures; token is most common cause |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| HOOK-01 | Phase 23 | Pending |
| HOOK-02 | Phase 23 | Pending |
| DISP-01 | Phase 24 | Pending |
| DISP-02 | Phase 24 | Pending |
| TOKN-01 | Phase 25 | Pending |
| TOKN-02 | Phase 25 | Pending |
| TOKN-03 | Phase 25 | Pending |
| TOKN-04 | Phase 25 | Pending |

**Coverage:**
- v1.7 requirements: 8 total
- Mapped to phases: 8
- Unmapped: 0

---
*Requirements defined: 2026-02-27*
*Last updated: 2026-02-27 after roadmap creation*
