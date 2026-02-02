# Phase 8: Client View Separation - Research

**Researched:** 2026-02-02
**Domain:** React tablet UI, tabs component, real-time data filtering
**Confidence:** HIGH

## Summary

This phase adds a client-specific view with two tabs to the existing tablet live application. The "I miei" tab displays individual exercises (`is_group=false`) and the "Gruppo" tab displays group exercises (`is_group=true`). The core challenge is **UI filtering of already-loaded data**, not new data fetching or backend changes.

The existing `useLiveCoaching` hook already fetches all exercises with `is_group` flag and has real-time subscriptions for instant updates. The implementation requires:
1. Adding a tabs UI component (shadcn/ui tabs via Radix)
2. Creating a client-specific view component that filters exercises by `is_group`
3. Integrating with the existing session data and realtime sync

**Primary recommendation:** Use shadcn/ui Tabs component (add via `npx shadcn@latest add tabs`), create a new `ClientExerciseView` component that wraps the existing `ExerciseCarousel` with tab-based filtering. No backend changes needed.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @radix-ui/react-tabs | latest | Accessible tabs primitive | Already using Radix for other shadcn components |
| shadcn/ui tabs | N/A | Styled tabs component | Project uses shadcn/ui pattern |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | ^0.562.0 | Icons for tabs | Already installed, use for tab badges/icons |
| useMemo | React 19 | Performance optimization | Filter exercises by is_group without re-computation |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| shadcn/ui tabs | Custom buttons (current header pattern) | Current header uses plain buttons; tabs provide better semantics and accessibility |
| Radix tabs | Headless UI tabs | Project already uses Radix primitives; consistency > alternatives |

**Installation:**
```bash
npx shadcn@latest add tabs
```

This adds:
- `@radix-ui/react-tabs` dependency
- `src/shared/components/ui/tabs.tsx` component file

## Architecture Patterns

### Recommended Project Structure

```
src/live/
├── components/
│   ├── ClientExerciseView.tsx     # NEW: Client view with tabs
│   ├── ExerciseCarousel.tsx       # EXISTING: Reused for individual exercises display
│   ├── GroupExerciseCard.tsx      # EXISTING: Could be reused for group tab
│   └── ...
├── pages/
│   └── TabletLive.tsx             # MODIFY: Add client view mode
```

### Pattern 1: Tab-Based Filtering with useMemo

**What:** Filter exercises by `is_group` flag using React `useMemo` for performance.

**When to use:** When same data source serves multiple views (tabs).

**Example:**
```typescript
// Source: Existing ExerciseCarousel pattern + standard React memoization
const { individualExercises, groupExercises } = useMemo(() => {
  const exercises = session.exercises || []
  return {
    individualExercises: exercises.filter(ex => !ex.is_group),
    groupExercises: exercises.filter(ex => ex.is_group),
  }
}, [session.exercises])
```

### Pattern 2: Shadcn/UI Tabs Component

**What:** Radix-based accessible tabs with Tailwind styling.

**When to use:** Multi-content views that need accessible tab navigation.

**Example:**
```tsx
// Source: Context7 shadcn/ui docs
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"

<Tabs defaultValue="individual" className="w-full">
  <TabsList>
    <TabsTrigger value="individual">I miei</TabsTrigger>
    <TabsTrigger value="group">Gruppo</TabsTrigger>
  </TabsList>
  <TabsContent value="individual">
    {/* Individual exercises content */}
  </TabsContent>
  <TabsContent value="group">
    {/* Group exercises content */}
  </TabsContent>
</Tabs>
```

### Pattern 3: Exercise Count Badges

**What:** Display exercise count on each tab trigger for quick information.

**When to use:** When users need to know content volume before switching tabs.

**Example:**
```tsx
<TabsTrigger value="individual">
  I miei {individualCount > 0 && <Badge variant="secondary">{individualCount}</Badge>}
</TabsTrigger>
```

### Pattern 4: Realtime Update Integration

**What:** Existing realtime subscription automatically updates tab content.

**When to use:** Already implemented in `useLiveCoaching` hook.

**Example:**
```typescript
// Source: useLiveCoaching.ts lines 773-804
// Already subscribes to session_exercises changes
// Updates include: completed, skipped, completed_at, is_group
// Tabs re-filter automatically via useMemo dependency on session.exercises
```

### Anti-Patterns to Avoid

- **Separate data fetches per tab:** Don't fetch exercises twice. Filter the existing session.exercises.
- **Tab state in URL:** This is a live session view, not a bookmarkable page. Use component state.
- **Animating tab content changes:** Context specifies "instant tab move" for is_group changes. Use CSS `display` toggle, not animated transitions.
- **Hiding empty tabs:** Keep both tabs visible with empty state messages. Tab presence indicates feature availability.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tab accessibility | Custom div buttons | Radix Tabs | Keyboard navigation, ARIA, focus management |
| Tab styling | Raw CSS | shadcn/ui tabs | Consistent with project design system |
| Exercise filtering | Multiple API calls | useMemo on existing data | Data already loaded by useLiveCoaching |
| Realtime sync | New subscription | Existing useLiveCoaching subscription | Already handles session_exercises updates |

**Key insight:** This phase is primarily UI work. The backend already supports everything needed. Don't add backend complexity.

## Common Pitfalls

### Pitfall 1: Current Exercise Index with Filtered List

**What goes wrong:** The `current_exercise_index` in session refers to the FULL exercise list, not the filtered (individual-only) list.

**Why it happens:** ExerciseCarousel uses `session.current_exercise_index` to highlight the current exercise, but tab view filters to individual exercises only.

**How to avoid:** Two approaches:
1. **Map indices:** Calculate the filtered index from the original index
2. **Track separately:** Maintain a separate `currentIndividualIndex` for the tab view

**Warning signs:** Current exercise highlight is wrong after filtering.

### Pitfall 2: Stale Tab Content After is_group Change

**What goes wrong:** Exercise moves to other tab but UI doesn't reflect immediately.

**Why it happens:** useMemo cache not invalidating, or realtime subscription not updating `is_group` field.

**How to avoid:** Ensure realtime subscription updates `is_group` field:
```typescript
// In useLiveCoaching realtime handler
ex.id === updated.id
  ? { ...ex, completed: updated.completed, skipped: updated.skipped,
      completed_at: updated.completed_at, is_group: updated.is_group }  // Add is_group!
  : ex
```

**Warning signs:** Exercise appears in wrong tab after coach changes is_group flag.

### Pitfall 3: Empty State Flash on Initial Load

**What goes wrong:** Empty state shows briefly before exercises load.

**Why it happens:** Async data load means exercises array starts empty.

**How to avoid:** Use loading state from `useLiveCoaching`, don't render tabs until data loaded.

**Warning signs:** "Nessun esercizio" message flashes on screen load.

### Pitfall 4: Tab Container Height Management

**What goes wrong:** Tab content doesn't fill available space, or overflows.

**Why it happens:** Tablet live page uses flex layout with min-h-0 to manage overflow. Tabs add nesting.

**How to avoid:** Ensure tabs container uses `flex-1 flex flex-col min-h-0` pattern:
```tsx
<Tabs className="flex-1 flex flex-col min-h-0">
  <TabsList className="shrink-0">...</TabsList>
  <TabsContent className="flex-1 min-h-0 overflow-auto">...</TabsContent>
</Tabs>
```

**Warning signs:** Content cut off or scroll not working.

## Code Examples

Verified patterns from official sources and existing codebase:

### Adding Tabs Component (shadcn/ui CLI)

```bash
# Source: shadcn/ui installation pattern
npx shadcn@latest add tabs
```

This creates `src/shared/components/ui/tabs.tsx` with Radix-based implementation.

### Client Exercise View Component Structure

```tsx
// Source: Adapting existing ExerciseCarousel and GroupExerciseView patterns
import { useMemo, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { ExerciseCarousel } from './ExerciseCarousel'
import { Badge } from '@/shared/components/ui/badge'
import { Users } from 'lucide-react'
import type { SessionWithDetails } from '@/shared/types'

interface ClientExerciseViewProps {
  session: SessionWithDetails
  onSelectExercise: (index: number) => void
  onUpdateExercise: (field: string, value: number | string | null) => void
}

export function ClientExerciseView({
  session,
  onSelectExercise,
  onUpdateExercise,
}: ClientExerciseViewProps) {
  const [activeTab, setActiveTab] = useState<'individual' | 'group'>('individual')

  const { individualExercises, groupExercises } = useMemo(() => {
    const exercises = session.exercises || []
    return {
      individualExercises: exercises.filter(ex => !ex.is_group),
      groupExercises: exercises.filter(ex => ex.is_group),
    }
  }, [session.exercises])

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'individual' | 'group')}>
      <TabsList>
        <TabsTrigger value="individual">
          I miei
          {individualExercises.length > 0 && (
            <Badge className="ml-2">{individualExercises.length}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="group">
          <Users className="w-4 h-4 mr-1" />
          Gruppo
          {groupExercises.length > 0 && (
            <Badge className="ml-2">{groupExercises.length}</Badge>
          )}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="individual">
        {/* Render individual exercises - adapt ExerciseCarousel */}
      </TabsContent>
      <TabsContent value="group">
        {/* Render group exercises - simplified list or cards */}
      </TabsContent>
    </Tabs>
  )
}
```

### Tab Styling for Dark Theme (Tablet)

```tsx
// Source: Existing TabletLive button styling pattern
<TabsList className="bg-gray-800 border border-gray-700">
  <TabsTrigger
    value="individual"
    className="data-[state=active]:bg-primary data-[state=active]:text-white text-gray-300"
  >
    I miei
  </TabsTrigger>
  {/* ... */}
</TabsList>
```

### Empty State Pattern

```tsx
// Source: Existing GroupExerciseView empty state pattern
{individualExercises.length === 0 ? (
  <div className="flex-1 flex items-center justify-center text-gray-400">
    <div className="text-center">
      <p className="text-lg">Nessun esercizio individuale</p>
      <p className="text-sm mt-2">I tuoi esercizi individuali appariranno qui</p>
    </div>
  </div>
) : (
  /* Exercise list */
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom tab buttons | Radix UI Tabs | Stable since 2023 | Better accessibility, keyboard nav |
| Filter in render | useMemo filtering | React best practice | Prevents unnecessary recalculation |

**Deprecated/outdated:**
- None for this scope. Tabs pattern is mature and stable.

## Open Questions

Things that couldn't be fully resolved:

1. **Current exercise index mapping for filtered list**
   - What we know: `session.current_exercise_index` refers to full list
   - What's unclear: Best UX when current exercise is a group exercise (shown in wrong tab)
   - Recommendation: Don't auto-switch tabs. Let user manually switch. Highlight might be absent from current tab if exercise is in other tab.

2. **Realtime subscription DOES NOT update is_group field (VERIFIED)**
   - What we know: Subscription at line 792 updates ONLY: completed, skipped, completed_at
   - What's confirmed: `is_group` field is NOT included in the realtime update
   - **Recommendation:** MUST add `is_group: updated.is_group` to the update handler in `useLiveCoaching.ts` line 792 to satisfy the "instant tab move" requirement

3. **Tab position (top vs side)**
   - What we know: Horizontal tabs are standard for two options
   - What's unclear: Whether to place above content (standard) or integrate into header
   - Recommendation: Place tabs at top of client content area (below header), horizontal orientation.

## Sources

### Primary (HIGH confidence)
- Context7 `/websites/ui_shadcn` - Tabs component implementation examples
- Context7 `/websites/radix-ui-primitives` - Tabs accessibility and keyboard navigation
- `/home/toto/scm-projects/helix/src/live/pages/TabletLive.tsx` - Current implementation patterns
- `/home/toto/scm-projects/helix/src/shared/hooks/useLiveCoaching.ts` - Realtime subscription pattern

### Secondary (MEDIUM confidence)
- `/home/toto/scm-projects/helix/src/live/components/ExerciseCarousel.tsx` - Exercise display pattern
- `/home/toto/scm-projects/helix/src/live/components/GroupExerciseView.tsx` - Group exercise filtering pattern

### Tertiary (LOW confidence)
- None. All findings verified with codebase and official documentation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - shadcn/ui is already used, tabs is a standard component
- Architecture: HIGH - Filtering pattern is simple and verified in existing code
- Pitfalls: HIGH - Based on existing codebase analysis

**Research date:** 2026-02-02
**Valid until:** 90 days (stable UI patterns, no fast-moving dependencies)
