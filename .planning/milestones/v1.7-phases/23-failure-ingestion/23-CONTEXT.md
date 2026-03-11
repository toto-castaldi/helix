# Phase 23: Failure Ingestion - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Receive and store Docora sync failure events so the system knows when a repository sync has failed. This phase handles only the webhook ingestion and data persistence — error display (Phase 24) and token recovery (Phase 25) are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Webhook contract
- Follow Docora documentation: `POST /sync_failed` as new action in existing `docora-webhook` Edge Function
- Same HMAC-SHA256 signature verification (X-Docora-Signature, X-Docora-Timestamp, X-Docora-App-Id)
- Payload is different from file webhooks: no `file` field, has `error`, `circuit_breaker`, `retry_count`, `event` fields
- Branch early in the handler (before file processing) since payload shape is completely different
- Add `"sync_failed"` to `DocoraAction` type in shared docora.ts
- Add new `DocoraSyncFailedPayload` type for the sync_failed-specific payload structure
- Store only `error.message` and `error.type` — circuit breaker details are Docora internals, not needed in Helix

### Data storage
- Add `'sync_failed'` to `sync_status` check constraint on `lumio_repositories` (ALTER constraint)
- Add nullable `sync_error_message` text column to `lumio_repositories` — stores `error.message` from webhook
- Add nullable `sync_failed_at` timestamptz column to `lumio_repositories` — stores when failure occurred
- On sync_failed webhook: set `sync_status = 'sync_failed'`, `sync_error_message = error.message`, `sync_failed_at = NOW()`
- Auto-clear on successful sync: when any file webhook (create/update/delete) succeeds, reset `sync_error_message = NULL` and `sync_failed_at = NULL` (sync_status already gets set to 'synced')

### Validation & edge cases
- Unknown repository_id: return 404 with warning log (consistent with existing webhook behavior)
- Repeated sync_failed for same repo: update with latest error message and timestamp (latest failure is most relevant)
- Log `console.warn` on successful sync_failed receipt: repo ID, error type, error message (visible in Supabase logs)
- Response: return 200 with `{success: true, message: 'Sync failure recorded'}`

### Claude's Discretion
- Exact code structure for the early branch in docora-webhook handler
- Whether to extract sync_failed handler into a separate function or keep inline
- Migration file naming and ordering

</decisions>

<specifics>
## Specific Ideas

- Webhook contract follows Docora documentation exactly: https://docora.toto-castaldi.com/webhooks/#post-sync_failed
- Docora payload includes: `event`, `repository`, `error` (type + message), `circuit_breaker` (status, consecutive_failures, threshold, cooldown_until), `retry_count`, `timestamp`
- Circuit breaker fires after 5 consecutive git failures — Helix only stores the error, not the circuit breaker metadata

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 23-failure-ingestion*
*Context gathered: 2026-02-28*
