# Phase 23: Failure Ingestion - Research

**Researched:** 2026-03-05
**Domain:** Supabase Edge Functions (Deno), PostgreSQL migrations, webhook handling
**Confidence:** HIGH

## Summary

Phase 23 adds sync_failed webhook handling to the existing `docora-webhook` Edge Function. The implementation extends a well-established codebase pattern: the same HMAC signature verification, the same Supabase client setup, and the same response patterns already used for create/update/delete file webhooks. The primary difference is the payload shape (no `file` field, has `error`/`circuit_breaker`/`retry_count` fields) and the action taken (update repository status instead of processing files).

The database changes are straightforward: alter the `sync_status` check constraint to include `'sync_failed'`, add two nullable columns (`sync_error_message` and `sync_failed_at`), and update the TypeScript types on both Edge Function and frontend sides. The auto-clear behavior on successful file webhooks requires a small addition to the existing docora-webhook handler where it already sets `sync_status: "synced"`.

**Primary recommendation:** Branch early in the handler on `action === "sync_failed"` before the file-processing pipeline, since the payload shape is completely different. Extract the sync_failed logic into a separate function for clarity.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Follow Docora documentation: `POST /sync_failed` as new action in existing `docora-webhook` Edge Function
- Same HMAC-SHA256 signature verification (X-Docora-Signature, X-Docora-Timestamp, X-Docora-App-Id)
- Payload is different from file webhooks: no `file` field, has `error`, `circuit_breaker`, `retry_count`, `event` fields
- Branch early in the handler (before file processing) since payload shape is completely different
- Add `"sync_failed"` to `DocoraAction` type in shared docora.ts
- Add new `DocoraSyncFailedPayload` type for the sync_failed-specific payload structure
- Store only `error.message` and `error.type` -- circuit breaker details are Docora internals, not needed in Helix
- Add `'sync_failed'` to `sync_status` check constraint on `lumio_repositories` (ALTER constraint)
- Add nullable `sync_error_message` text column to `lumio_repositories` -- stores `error.message` from webhook
- Add nullable `sync_failed_at` timestamptz column to `lumio_repositories` -- stores when failure occurred
- On sync_failed webhook: set `sync_status = 'sync_failed'`, `sync_error_message = error.message`, `sync_failed_at = NOW()`
- Auto-clear on successful sync: when any file webhook (create/update/delete) succeeds, reset `sync_error_message = NULL` and `sync_failed_at = NULL` (sync_status already gets set to 'synced')
- Unknown repository_id: return 404 with warning log (consistent with existing webhook behavior)
- Repeated sync_failed for same repo: update with latest error message and timestamp (latest failure is most relevant)
- Log `console.warn` on successful sync_failed receipt: repo ID, error type, error message (visible in Supabase logs)
- Response: return 200 with `{success: true, message: 'Sync failure recorded'}`

### Claude's Discretion
- Exact code structure for the early branch in docora-webhook handler
- Whether to extract sync_failed handler into a separate function or keep inline
- Migration file naming and ordering

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| HOOK-01 | Helix receives and validates Docora `sync_failed` webhook with HMAC signature | Existing `verifyDocoraSignature()` in `_shared/docora.ts` handles this. URL action extraction in `extractAction()` needs `"sync_failed"` added. Docora payload structure verified from official docs. |
| HOOK-02 | Sync failure updates repository status to 'sync_failed' with error message stored | Database migration adds `sync_error_message` and `sync_failed_at` columns, alters check constraint. Edge Function updates these fields. Auto-clear on successful file webhook. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase Edge Functions (Deno) | Current | Webhook handler runtime | Already used by docora-webhook |
| @supabase/supabase-js | v2 | Database client with service role | Already imported in docora-webhook |
| PostgreSQL 15 | 15.x | Database with check constraints | Already used, Supabase managed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Web Crypto API | Built-in Deno | HMAC-SHA256 verification | Already used in `verifyDocoraSignature()` |

### Alternatives Considered
None -- this phase uses the exact same stack as existing webhook handling. No new dependencies needed.

## Architecture Patterns

### Existing Project Structure (relevant files)
```
supabase/
  functions/
    _shared/
      docora.ts           # DocoraAction type, verifyDocoraSignature, payload types
    docora-webhook/
      index.ts            # Main handler -- modify this
  migrations/
    00000000000021_*.sql  # Next migration number
src/
  shared/types/index.ts   # SyncStatus type, LumioRepository interface
  components/repositories/
    SyncStatusBadge.tsx    # Status badge -- Phase 24 concern, not this phase
    RepositoryCard.tsx     # Card component -- Phase 24 concern, not this phase
```

### Pattern 1: Early Branch for Different Payload Shape
**What:** The sync_failed action has a completely different payload from file webhooks (no `file` field). Branch immediately after action extraction, before any file-specific logic.
**When to use:** When the same endpoint handles fundamentally different event types.
**Example:**
```typescript
// In docora-webhook/index.ts, after signature verification and body parsing:
const action = extractAction(req.url)

// Early branch for sync_failed -- payload shape is completely different
if (action === "sync_failed") {
  const payload: DocoraSyncFailedPayload = JSON.parse(bodyText)
  return await handleSyncFailed(supabase, payload)
}

// Existing file webhook logic continues below...
const payload: DocoraWebhookPayload = JSON.parse(bodyText)
const { repository: docoraRepo, file, commit_sha, ... } = payload
```

### Pattern 2: Extracted Handler Function
**What:** Separate `handleSyncFailed()` function keeps the main handler clean and mirrors the existing `processMarkdownFile()` and `processImageFile()` pattern.
**Example:**
```typescript
async function handleSyncFailed(
  supabase: ReturnType<typeof createClient>,
  payload: DocoraSyncFailedPayload
): Promise<Response> {
  // Find repository
  // Update sync_status, sync_error_message, sync_failed_at
  // Return response
}
```

### Pattern 3: Auto-Clear on Success
**What:** When any file webhook succeeds, clear the error fields so the repo returns to healthy state.
**Where:** In the existing success path where `sync_status: "synced"` is already set (lines 306-312 and 373-379 in current code).
**Example:**
```typescript
// Existing update (currently at two locations in docora-webhook):
await supabase
  .from("lumio_repositories")
  .update({
    last_sync_at: new Date().toISOString(),
    sync_status: "synced",
    // ADD these two lines:
    sync_error_message: null,
    sync_failed_at: null,
  })
  .eq("id", repository.id)
```

### Anti-Patterns to Avoid
- **Parsing file-specific payload for sync_failed:** The sync_failed payload has no `file` field. Attempting to destructure `{ file }` from it will fail silently. Branch before parsing.
- **Forgetting auto-clear locations:** There are two places in the existing handler where sync_status is set to "synced" (line 309 for .lumioignore processing, line 376 for file processing). Both need the auto-clear.
- **Using `sync_error` column:** The existing `sync_error` column from the original schema is for the old manual sync. The decision is to use a new `sync_error_message` column for Docora failures. Do not reuse the old column.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HMAC verification | Custom crypto | Existing `verifyDocoraSignature()` | Already battle-tested, same auth headers |
| Supabase client | Custom HTTP client | `createClient()` with service role | Already established pattern |
| URL action parsing | Custom regex | Existing `extractAction()` (after updating) | Consistent with existing code |

**Key insight:** This phase reuses virtually all existing infrastructure. The only new code is the branching logic, the sync_failed handler function, and the database migration.

## Common Pitfalls

### Pitfall 1: Unnamed Check Constraint
**What goes wrong:** The `sync_status` check constraint in migration `00000000000006` is inline and unnamed. PostgreSQL auto-generates a name like `lumio_repositories_sync_status_check`.
**Why it happens:** The original migration used `check (sync_status in (...))` without naming it.
**How to avoid:** In the new migration, drop the constraint by its auto-generated name and recreate it. The standard PostgreSQL naming convention for inline checks is `{table}_{column}_check`.
**Warning signs:** Migration fails with "constraint does not exist" -- check actual constraint name with `\d+ lumio_repositories`.

### Pitfall 2: Forgetting extractAction() Update
**What goes wrong:** The `extractAction()` function only recognizes `"create"`, `"update"`, `"delete"`. If `"sync_failed"` is not added to the allowed list, all sync_failed webhooks return 400 "Invalid action."
**Why it happens:** The function uses a hardcoded array check.
**How to avoid:** Update the array in `extractAction()` AND the `DocoraAction` type in `_shared/docora.ts`.

### Pitfall 3: Two Sync-Status Update Locations
**What goes wrong:** Auto-clear only gets added to one of the two places where `sync_status: "synced"` is set. The other path still leaves stale error data.
**Why it happens:** The `.lumioignore` processing path (line ~306-312) and the normal file processing path (line ~373-379) both update the repository status independently.
**How to avoid:** Search for ALL occurrences of `sync_status: "synced"` in docora-webhook/index.ts and add auto-clear to each.
**Warning signs:** Error badge persists after successful file sync in some cases.

### Pitfall 4: TypeScript Types Out of Sync
**What goes wrong:** Frontend `SyncStatus` type doesn't include `'sync_failed'`, causing type errors or silent filtering.
**Why it happens:** The type is defined in `src/shared/types/index.ts` (line 298) as a union. Phase 24 will use this type for display, but it needs to be updated in Phase 23 to keep types consistent with the database.
**How to avoid:** Update `SyncStatus` type to include `'sync_failed'`. Also update `SyncStatusBadge` config map to handle the new status -- but note that the actual display change is Phase 24's concern. Adding the type entry prevents crashes.

### Pitfall 5: CORS Headers Missing on Sync Failed Response
**What goes wrong:** New response paths forget to include `corsHeaders`.
**Why it happens:** Copy-paste from a path that doesn't use CORS headers.
**How to avoid:** Use the same response pattern as existing handlers: `{ headers: { ...corsHeaders, "Content-Type": "application/json" } }`.

## Code Examples

### Migration: Add sync_failed support to lumio_repositories
```sql
-- Migration: Sync Failed Support - v1.7 Phase 23
-- Adds sync_failed status and error tracking columns

-- Step 1: Drop existing check constraint and recreate with sync_failed
ALTER TABLE lumio_repositories
DROP CONSTRAINT lumio_repositories_sync_status_check;

ALTER TABLE lumio_repositories
ADD CONSTRAINT lumio_repositories_sync_status_check
CHECK (sync_status IN ('pending', 'syncing', 'synced', 'error', 'sync_failed'));

-- Step 2: Add error tracking columns
ALTER TABLE lumio_repositories
ADD COLUMN sync_error_message text,
ADD COLUMN sync_failed_at timestamptz;

-- Comments for documentation
COMMENT ON COLUMN lumio_repositories.sync_error_message IS 'Error message from Docora sync_failed webhook';
COMMENT ON COLUMN lumio_repositories.sync_failed_at IS 'Timestamp when sync failure was recorded';
```

### Shared type: DocoraSyncFailedPayload
```typescript
// In _shared/docora.ts
export interface DocoraSyncFailedError {
  type: string    // e.g., "git_failure"
  message: string // e.g., "Authentication failed for..."
}

export interface DocoraSyncFailedPayload {
  event: "sync_failed"
  repository: DocoraRepository
  error: DocoraSyncFailedError
  circuit_breaker: {
    status: string
    consecutive_failures: number
    threshold: number
    cooldown_until: string
  }
  retry_count: number
  timestamp: string
}
```

### Handler: sync_failed processing
```typescript
// In docora-webhook/index.ts
async function handleSyncFailed(
  supabase: ReturnType<typeof createClient>,
  payload: DocoraSyncFailedPayload
): Promise<Response> {
  const { repository: docoraRepo, error: syncError } = payload

  // Find repository by docora_repository_id
  const { data: repo, error: repoError } = await supabase
    .from("lumio_repositories")
    .select("id")
    .eq("docora_repository_id", docoraRepo.repository_id)
    .single()

  if (repoError || !repo) {
    console.warn("sync_failed: Repository not found for Docora ID:", docoraRepo.repository_id)
    return new Response(
      JSON.stringify({ error: "Repository not registered", docoraId: docoraRepo.repository_id }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  // Update repository with failure status
  await supabase
    .from("lumio_repositories")
    .update({
      sync_status: "sync_failed",
      sync_error_message: syncError.message,
      sync_failed_at: new Date().toISOString(),
    })
    .eq("id", repo.id)

  console.warn(
    `sync_failed: repo=${repo.id}, error_type=${syncError.type}, message=${syncError.message}`
  )

  return new Response(
    JSON.stringify({ success: true, message: "Sync failure recorded" }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  )
}
```

### Auto-clear pattern (add to existing update calls)
```typescript
// Add to BOTH locations where sync_status: "synced" is set
sync_error_message: null,
sync_failed_at: null,
```

### Updated extractAction function
```typescript
function extractAction(url: string): DocoraAction | null {
  const urlObj = new URL(url)
  const pathParts = urlObj.pathname.split("/").filter(Boolean)
  const lastPart = pathParts[pathParts.length - 1]

  if (["create", "update", "delete", "sync_failed"].includes(lastPart)) {
    return lastPart as DocoraAction
  }
  return null
}
```

### Updated TypeScript types (frontend)
```typescript
// In src/shared/types/index.ts
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'error' | 'sync_failed'

// Add to LumioRepository interface:
sync_error_message: string | null
sync_failed_at: string | null
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual sync with `sync_error` field | Docora webhook-based sync | Milestone 10 | `sync_error` is legacy; new `sync_error_message` for Docora failures |
| Only file webhooks (create/update/delete) | File webhooks + sync_failed | This phase | New action type in same endpoint |

**Deprecated/outdated:**
- `sync_error` column: Legacy from manual sync era. Still exists but not used by Docora integration. The new `sync_error_message` is specifically for Docora sync failures.
- `lumio-sync-repo` Edge Function: Deprecated, replaced by Docora webhooks. Still deployed but unused.

## Open Questions

1. **Constraint name uncertainty**
   - What we know: The check constraint was created inline without a name in migration 006. PostgreSQL auto-generates the name `lumio_repositories_sync_status_check` by convention.
   - What's unclear: The actual constraint name in production could differ if it was manually altered.
   - Recommendation: Use `lumio_repositories_sync_status_check` as this is PostgreSQL's standard naming. If migration fails, check with `SELECT conname FROM pg_constraint WHERE conrelid = 'lumio_repositories'::regclass AND contype = 'c';`.

2. **SyncStatusBadge handling of 'sync_failed'**
   - What we know: The `statusConfig` map in SyncStatusBadge.tsx only has entries for 'pending', 'syncing', 'synced', 'error'. If sync_status becomes 'sync_failed' and the frontend renders it, there will be a runtime error (undefined config).
   - What's unclear: Whether to add a minimal entry now (Phase 23) or wait for Phase 24.
   - Recommendation: Add a minimal entry to `statusConfig` in Phase 23 to prevent crashes. Phase 24 can refine it. Use destructive variant with AlertCircle icon and "Errore sync" label as a safe default.

## Sources

### Primary (HIGH confidence)
- Docora webhook documentation: https://docora.toto-castaldi.com/webhooks/#post-sync_failed -- sync_failed payload structure, triggering conditions, expected response
- Existing codebase: `supabase/functions/docora-webhook/index.ts` -- current handler structure, response patterns, update locations
- Existing codebase: `supabase/functions/_shared/docora.ts` -- DocoraAction type, payload types, verifyDocoraSignature implementation
- Existing codebase: `supabase/migrations/00000000000006_lumio_repositories.sql` -- original table schema with check constraint
- Existing codebase: `src/shared/types/index.ts` -- SyncStatus type, LumioRepository interface

### Secondary (MEDIUM confidence)
- PostgreSQL check constraint naming convention: auto-generated as `{table}_{column}_check` for unnamed inline checks

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all existing technology, no new dependencies
- Architecture: HIGH - pattern directly mirrors existing webhook handling, verified from source code
- Pitfalls: HIGH - identified from reading actual codebase, all verified against existing code

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (stable -- Deno Edge Functions and PostgreSQL are mature)
