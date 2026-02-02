---
phase: 08
plan: 01
subsystem: live-tablet
tags: [tabs, client-view, realtime, shadcn-ui]
dependencies:
  requires: [07-complete]
  provides: [client-view-tabs, is_group-realtime-sync]
  affects: [08-02]
tech-stack:
  added: [@radix-ui/react-tabs]
  patterns: [tab-filtering, index-mapping]
key-files:
  created:
    - src/shared/components/ui/tabs.tsx
    - src/live/components/ClientExerciseView.tsx
  modified:
    - src/shared/hooks/useLiveCoaching.ts
    - src/live/pages/TabletLive.tsx
    - package.json
metrics:
  duration: 5m
  completed: 2026-02-02
---

# Phase 08 Plan 01: Client View Separation Summary

**One-liner:** Tabbed client view in tablet app separating individual and group exercises with realtime sync.

## What Was Built

Added a tabbed interface to the tablet live coaching app that separates exercises by type:

1. **Tabs Component** - Added shadcn/ui tabs component (`@radix-ui/react-tabs`) to shared UI library

2. **ClientExerciseView Component** - New component that:
   - Filters exercises by `is_group` flag using `useMemo`
   - Displays "I miei" (individual) and "Gruppo" (group) tabs
   - Shows exercise count badges on each tab
   - Maps back to original indices for proper selection
   - Includes empty states for both tabs

3. **Realtime Sync Fix** - Updated `useLiveCoaching.ts` to include `is_group` field in realtime subscription, enabling instant tab transitions when exercises change type

4. **Integration** - Replaced `ExerciseCarousel` with `ClientExerciseView` in `TabletLive.tsx` for the individual view mode

## Key Implementation Details

### Tab Filtering Pattern

```typescript
const { individualExercises, groupExercises, individualIndices, groupIndices } = useMemo(() => {
  const exercises = session.exercises || []
  exercises.forEach((ex, idx) => {
    if (ex.is_group) {
      group.push(ex); grpIdx.push(idx)
    } else {
      individual.push(ex); indivIdx.push(idx)
    }
  })
  return { individualExercises, groupExercises, individualIndices, groupIndices }
}, [session.exercises])
```

### Realtime is_group Sync

```typescript
ex.id === updated.id
  ? { ...ex, completed: updated.completed, skipped: updated.skipped,
      completed_at: updated.completed_at, is_group: updated.is_group }
  : ex
```

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 2fd235c | feat | Add tabs component and fix realtime is_group sync |
| 07e91df | feat | Create ClientExerciseView with tabbed filtering |
| 0f9ad60 | feat | Integrate ClientExerciseView into TabletLive |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Status

- [x] Build completes without errors (`npm run build:live`)
- [x] Tabs component exports: Tabs, TabsList, TabsTrigger, TabsContent
- [x] ClientExerciseView filters by is_group
- [x] Realtime subscription includes is_group field
- [x] Empty states for both tabs

## Next Phase Readiness

**Ready for:** 08-02 (if planned) or Phase 09

**Dependencies provided:**
- Client view tabs infrastructure
- is_group realtime sync
- Index mapping pattern for filtered lists
