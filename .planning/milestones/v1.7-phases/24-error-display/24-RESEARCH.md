# Phase 24: Error Display - Research

**Researched:** 2026-03-11
**Domain:** React UI -- extending RepositoryCard with error state display and action button
**Confidence:** HIGH

## Summary

This phase is a straightforward frontend-only change. The existing `RepositoryCard.tsx` already contains an error display block for `sync_status === 'error'` (lines 136-140), and we need to add a parallel block for `sync_status === 'sync_failed'` that also includes an "Aggiorna token" action button. The `LumioRepository` type already has `sync_error_message` and `sync_failed_at` fields from Phase 23. The `SyncStatusBadge` already handles the `sync_failed` status with a destructive badge.

The only new concept is the `onUpdateToken` callback prop, which follows the exact same pattern as `onEdit`, `onDelete`, and `onViewCards` -- drilled from `Repositories.tsx` through `RepositoryList.tsx` to `RepositoryCard.tsx`. The Button component's `outline` variant with `size="sm"` is already available.

**Primary recommendation:** Extend the existing error display pattern in RepositoryCard with a second conditional block for sync_failed, add the onUpdateToken callback prop through the existing prop-drilling chain, and wire a no-op stub handler in the Repositories page.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Same subtle red box as existing `error` status (bg-destructive/10, text-destructive, rounded)
- Show the raw Docora error message from `sync_error_message` field as-is
- No timestamp display -- keep it minimal
- Always visible on all screen sizes -- error is action-required, never hidden
- Button label: "Aggiorna token"
- Position: inside the error box, below the error message
- Style: small outline variant using existing shadcn Button component
- Text only -- no icon
- Unified red box pattern for both `error` and `sync_failed` statuses
- `sync_status === 'error'`: shows `sync_error` field, no action button
- `sync_status === 'sync_failed'`: shows `sync_error_message` field + "Aggiorna token" button
- SyncStatusBadge keeps distinct labels (already implemented, no changes needed)
- New `onUpdateToken` callback prop on RepositoryCard (receives LumioRepository)
- Pass through RepositoryList (same pattern as onEdit/onDelete/onViewCards)
- Repositories page passes stub no-op handler until Phase 25 implements the dialog
- Button only renders when `sync_status === 'sync_failed'`

### Claude's Discretion
- Exact spacing/padding inside the error box
- Whether to extract the error box into a shared component or keep inline
- Any minor adjustments to make the button fit well in the red box

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DISP-01 | Repository card shows simple error message when sync status is 'sync_failed' | Existing error block pattern at RepositoryCard.tsx L136-140 serves as exact template; `sync_error_message` field available on `LumioRepository` type |
| DISP-02 | Error state includes "Update token" action button on the repository card | shadcn Button with `variant="outline"` and `size="sm"` available; `onUpdateToken` callback follows established prop-drilling pattern (onEdit/onDelete/onViewCards) |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19 | UI framework | Project standard |
| TypeScript | - | Type safety | Project standard |
| Tailwind CSS | - | Styling (utility classes) | Project standard |
| shadcn/ui | - | Button component | Project standard -- `outline` variant + `size="sm"` already available |

### Supporting
No additional libraries needed. All required components and types already exist in the codebase.

## Architecture Patterns

### Existing Structure (No Changes)
```
src/
  components/repositories/
    RepositoryCard.tsx     # ADD: sync_failed error block + button
    RepositoryList.tsx     # ADD: onUpdateToken prop pass-through
    SyncStatusBadge.tsx    # NO CHANGES (already handles sync_failed)
    index.ts              # NO CHANGES
  pages/
    Repositories.tsx       # ADD: onUpdateToken stub handler
  shared/types/
    index.ts              # NO CHANGES (LumioRepository already has fields)
```

### Pattern 1: Error Display Block (Existing)
**What:** Conditional red box below card content showing error message
**When to use:** When `sync_status` indicates a failure
**Example (existing code at RepositoryCard.tsx L136-140):**
```typescript
{repository.sync_status === 'error' && repository.sync_error && (
  <div className="mt-2 p-2 bg-destructive/10 rounded text-sm text-destructive break-words">
    {repository.sync_error}
  </div>
)}
```

### Pattern 2: Callback Prop Drilling (Existing)
**What:** Callbacks passed from page -> list -> card
**When to use:** When a card action needs to trigger page-level behavior
**Example (existing pattern):**
```typescript
// RepositoryCard props
interface RepositoryCardProps {
  repository: LumioRepository
  onEdit: (repository: LumioRepository) => void
  onDelete: (repository: LumioRepository) => void
  onViewCards: (repository: LumioRepository) => void
  // NEW: onUpdateToken: (repository: LumioRepository) => void
}

// RepositoryList passes through
<RepositoryCard
  repository={repository}
  onEdit={onEdit}
  onDelete={onDelete}
  onViewCards={onViewCards}
  // NEW: onUpdateToken={onUpdateToken}
/>

// Repositories page provides handler
<RepositoryList
  repositories={repositories}
  onEdit={openEditForm}
  onDelete={openDeleteConfirm}
  onViewCards={setViewingCardsRepo}
  // NEW: onUpdateToken={() => {}} // stub for Phase 25
/>
```

### Pattern 3: Sync Failed Error Block (NEW)
**What:** Red box with error message AND action button
**When to use:** When `sync_status === 'sync_failed'`
**Example:**
```typescript
{repository.sync_status === 'sync_failed' && repository.sync_error_message && (
  <div className="mt-2 p-2 bg-destructive/10 rounded text-sm text-destructive break-words">
    <p>{repository.sync_error_message}</p>
    <Button
      variant="outline"
      size="sm"
      className="mt-2"
      onClick={() => onUpdateToken(repository)}
    >
      Aggiorna token
    </Button>
  </div>
)}
```

### Anti-Patterns to Avoid
- **Merging error and sync_failed into one block:** They use different source fields (`sync_error` vs `sync_error_message`) and different behavior (no button vs button). Keep them as separate conditional blocks.
- **Adding a new state variable for the dialog:** Phase 25 handles that. This phase only wires the callback with a no-op stub.
- **Modifying SyncStatusBadge:** It already works correctly for sync_failed. Do not touch it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Button styling | Custom styled button | `<Button variant="outline" size="sm">` from shadcn | Already available with correct styling |
| Error color tokens | Hard-coded hex colors | `bg-destructive/10 text-destructive` Tailwind tokens | Matches existing error block, theme-aware |

**Key insight:** Every building block already exists in the codebase. This phase is purely assembly, not creation.

## Common Pitfalls

### Pitfall 1: Wrong Error Field for sync_failed
**What goes wrong:** Using `sync_error` instead of `sync_error_message` for the sync_failed display
**Why it happens:** Two similarly-named fields exist: `sync_error` (for generic `error` status) and `sync_error_message` (for Docora `sync_failed` webhook)
**How to avoid:** Map clearly: `error` status -> `sync_error` field, `sync_failed` status -> `sync_error_message` field
**Warning signs:** Error message shows as blank/null when testing with sync_failed status

### Pitfall 2: Button Styling Clash with Destructive Container
**What goes wrong:** The outline button's default border/text colors may not be readable inside the red `bg-destructive/10` container
**Why it happens:** The outline variant uses `border-input` and `hover:bg-accent` which might not contrast well with the destructive background
**How to avoid:** Test visually. May need to add `text-destructive border-destructive/30` or similar overrides to the button className
**Warning signs:** Button looks invisible or washed out inside the red box

### Pitfall 3: Forgetting to Handle Missing sync_error_message
**What goes wrong:** If `sync_error_message` is null, the error box renders empty with just a button
**Why it happens:** The webhook could theoretically set sync_failed without a message
**How to avoid:** Guard with `&& repository.sync_error_message` in the conditional, same as existing error block pattern
**Warning signs:** Empty red box with only a button

## Code Examples

### Complete RepositoryCard sync_failed Block
```typescript
// Source: Extension of existing pattern at RepositoryCard.tsx L136-140
{repository.sync_status === 'sync_failed' && repository.sync_error_message && (
  <div className="mt-2 p-2 bg-destructive/10 rounded text-sm text-destructive break-words">
    <p>{repository.sync_error_message}</p>
    <Button
      variant="outline"
      size="sm"
      className="mt-2"
      onClick={() => onUpdateToken(repository)}
    >
      Aggiorna token
    </Button>
  </div>
)}
```

### Updated RepositoryCardProps Interface
```typescript
interface RepositoryCardProps {
  repository: LumioRepository
  onEdit: (repository: LumioRepository) => void
  onDelete: (repository: LumioRepository) => void
  onViewCards: (repository: LumioRepository) => void
  onUpdateToken: (repository: LumioRepository) => void
}
```

### Stub Handler in Repositories.tsx
```typescript
// Phase 25 will replace this with dialog-opening logic
<RepositoryList
  repositories={repositories}
  onEdit={openEditForm}
  onDelete={openDeleteConfirm}
  onViewCards={setViewingCardsRepo}
  onUpdateToken={() => {}}
/>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Only `error` sync status | Both `error` and `sync_failed` statuses | Phase 23 (v1.7) | `sync_failed` is new Docora webhook-driven status; `error` remains for generic failures |

**No deprecated/outdated concerns.** All required types and components are current.

## Open Questions

1. **Button visual contrast inside destructive container**
   - What we know: The outline button variant uses `border-input bg-background` colors
   - What's unclear: Whether this creates sufficient contrast inside `bg-destructive/10`
   - Recommendation: Implement with standard outline variant first, adjust className overrides if contrast is poor during visual testing

2. **sync_error_message null case**
   - What we know: Phase 23 webhook handler sets `sync_error_message` from the Docora payload
   - What's unclear: Whether Docora ever sends `sync_failed` without a message
   - Recommendation: Guard with `&& repository.sync_error_message` (consistent with existing error block pattern). If null, the SyncStatusBadge still shows "Errore sync" so the user is not left without indication.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None -- no test framework configured in this project |
| Config file | None |
| Quick run command | `npm run build` (type check + build) |
| Full suite command | `npm run build && npm run lint` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DISP-01 | sync_failed card shows error message | manual-only | Visual verification in browser | N/A |
| DISP-02 | Error card includes "Aggiorna token" button | manual-only | Visual verification in browser | N/A |

**Justification for manual-only:** This project has no test framework or test infrastructure. Both requirements are purely visual/UI behaviors that would need component testing setup (Vitest + React Testing Library or similar). The scope of this phase does not justify introducing a test framework. TypeScript compilation (`npm run build`) verifies type correctness of the new props and callback wiring.

### Sampling Rate
- **Per task commit:** `npm run build` (type check catches interface/prop mismatches)
- **Per wave merge:** `npm run build && npm run lint`
- **Phase gate:** Build + lint green, manual visual verification

### Wave 0 Gaps
None -- no test infrastructure exists in this project, and adding one is out of scope for this phase.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection of all files involved:
  - `src/components/repositories/RepositoryCard.tsx` -- existing error block pattern (L136-140)
  - `src/components/repositories/RepositoryList.tsx` -- prop drilling pattern
  - `src/components/repositories/SyncStatusBadge.tsx` -- already handles sync_failed
  - `src/pages/Repositories.tsx` -- callback handler pattern
  - `src/shared/types/index.ts` -- LumioRepository type with sync_error_message, sync_failed_at
  - `src/shared/components/ui/button.tsx` -- outline variant, sm size available

### Secondary (MEDIUM confidence)
- None needed -- all findings are from direct code inspection

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in use, no new dependencies
- Architecture: HIGH -- exact patterns already exist in the same file (error block, callback drilling)
- Pitfalls: HIGH -- identified from direct code analysis of the specific fields and components involved

**Research date:** 2026-03-11
**Valid until:** Indefinite -- all findings based on current codebase state, no external dependencies
