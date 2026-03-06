# Phase 24: Error Display - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Show sync failure status on repository cards with a clear recovery action. Coaches see at a glance which repositories have sync failures and get a path to fix them. The actual token update dialog is Phase 25 — this phase only displays the error and wires the button callback.

</domain>

<decisions>
## Implementation Decisions

### Error message presentation
- Same subtle red box as existing `error` status (bg-destructive/10, text-destructive, rounded)
- Show the raw Docora error message from `sync_error_message` field as-is
- No timestamp display — keep it minimal (SyncStatusBadge already signals the problem)
- Always visible on all screen sizes — error is action-required, never hidden

### "Update token" button design
- Label: "Aggiorna token"
- Position: inside the error box, below the error message
- Style: small outline variant using existing shadcn Button component
- Text only — no icon (error box context is sufficient)

### Error vs sync_failed coexistence
- Unified red box pattern for both `error` and `sync_failed` statuses
- `sync_status === 'error'`: shows `sync_error` field, no action button (not a token issue)
- `sync_status === 'sync_failed'`: shows `sync_error_message` field + "Aggiorna token" button
- SyncStatusBadge keeps distinct labels: 'Errore' for `error`, 'Errore sync' for `sync_failed` (already implemented)

### Callback wiring
- New `onUpdateToken` callback prop on RepositoryCard (receives LumioRepository)
- Pass through RepositoryList (same pattern as onEdit/onDelete/onViewCards)
- Repositories page passes stub no-op handler until Phase 25 implements the dialog
- Button only renders when `sync_status === 'sync_failed'`

### Claude's Discretion
- Exact spacing/padding inside the error box
- Whether to extract the error box into a shared component or keep inline
- Any minor adjustments to make the button fit well in the red box

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `RepositoryCard.tsx`: Already has error block for `sync_status === 'error'` (lines 136-140) — extend this pattern for `sync_failed`
- `SyncStatusBadge.tsx`: Already has `sync_failed` entry with destructive variant — no changes needed
- `Button` from shadcn: outline variant + size="sm" available
- `LumioRepository` type: Already has `sync_error_message` and `sync_failed_at` fields from Phase 23

### Established Patterns
- Props drilling: RepositoryCard receives callbacks from Repositories page via RepositoryList (onEdit, onDelete, onViewCards)
- Italian UI labels throughout the coach app
- Tailwind destructive color tokens for error states

### Integration Points
- `RepositoryCard.tsx`: Add sync_failed error block + button
- `RepositoryList.tsx`: Pass through new onUpdateToken prop
- `Repositories.tsx`: Add onUpdateToken handler (stub for now, Phase 25 connects dialog)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — straightforward extension of existing error display pattern with an action button.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 24-error-display*
*Context gathered: 2026-03-06*
