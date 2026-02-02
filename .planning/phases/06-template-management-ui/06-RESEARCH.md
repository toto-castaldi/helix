# Phase 6: Template Management UI - Research

**Researched:** 2026-02-01
**Domain:** React CRUD UI for group exercise templates with Supabase backend
**Confidence:** HIGH

## Summary

Phase 6 implements the frontend for managing group templates. The UI follows existing Helix patterns: hooks for data operations, page components with `useEntityPage` for CRUD state, and reusable form/card components. Templates live under Sessions section with a dedicated management page/view.

Key decisions from CONTEXT.md:
- Templates accessible from Sessions page header (not separate nav item)
- Single form for name + exercises on same screen
- Reuse existing ExercisePicker component
- Linked behavior: session exercises reference template, not copies
- Block editing template exercises in session view
- Block template deletion if any session uses it

**Critical discovery:** CONTEXT.md specifies "Linked to template" behavior where session exercises are references. This requires a schema migration to add `template_id` to `session_exercises` - currently missing from the schema. This migration must be part of Plan 06-01.

**Primary recommendation:** Use existing Helix UI patterns (useEntityPage, FormCard, Card components), full-page view for templates (not sheet/drawer) for consistency with Sessions page, and add the required `template_id` column to enable linked behavior.

## Standard Stack

No new dependencies. Uses existing Helix stack.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.x | UI framework | Already in use |
| react-hook-form | 7.69+ | Form handling | Already in use (GymForm pattern) |
| zod | 4.2+ | Schema validation | Already in use (GymForm pattern) |
| @supabase/supabase-js | 2.x | Backend client | Already in use |

### UI Components (already available)
| Component | Purpose | Status |
|-----------|---------|--------|
| Card, CardContent | List items | Available |
| Button, Input, Label, Textarea | Form controls | Available |
| Badge | Exercise tags display | Available |
| Switch | Toggle controls | Available |

### Shared Components (already available)
| Component | Purpose | File |
|-----------|---------|------|
| PageHeader | Page title + actions | `src/components/shared/PageHeader.tsx` |
| FormCard | Form wrapper with close | `src/components/shared/FormCard.tsx` |
| DeleteConfirmDialog | Deletion confirmation | `src/components/shared/DeleteConfirmDialog.tsx` |
| LoadingSpinner | Loading state | `src/components/shared/LoadingSpinner.tsx` |
| ErrorAlert | Error display | `src/components/shared/ErrorAlert.tsx` |
| EmptyState | No data message | `src/components/shared/EmptyState.tsx` |
| CardActions | Edit/Delete buttons | `src/components/shared/CardActions.tsx` |
| FormActions | Save/Cancel buttons | `src/components/shared/FormActions.tsx` |

## Architecture Patterns

### Recommended Project Structure

```
src/
├── hooks/
│   └── useGroupTemplates.ts       # Template CRUD operations
├── pages/
│   └── (no new page - access via Sessions)
├── components/
│   ├── sessions/
│   │   └── (existing files - add template button)
│   └── templates/                  # NEW: Template components
│       ├── index.ts
│       ├── TemplateList.tsx        # List of templates
│       ├── TemplateCard.tsx        # Template item card
│       ├── TemplateForm.tsx        # Create/edit form
│       ├── TemplateExerciseCard.tsx # Exercise in template
│       ├── TemplateManager.tsx     # Full template management view
│       └── ApplyTemplateButton.tsx # Button for session detail
```

### Pattern 1: Hook for CRUD Operations

Follow `useGyms.ts` pattern with additions for child exercises.

```typescript
// Source: Helix existing pattern in src/hooks/useGyms.ts
export function useGroupTemplates() {
  const [templates, setTemplates] = useState<GroupTemplateWithExercises[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch templates with exercises
  const fetchTemplates = useCallback(async () => {
    const { data, error } = await supabase
      .from('group_templates')
      .select(`
        *,
        exercises:group_template_exercises(
          *,
          exercise:exercises(*)
        )
      `)
      .order('name', { ascending: true })
    // ... handle response
  }, [])

  // CRUD operations follow useGyms pattern
  return {
    templates,
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    addExercise,
    updateExercise,
    removeExercise,
    reorderExercises,
    refetch: fetchTemplates,
  }
}
```

### Pattern 2: Page/View with useEntityPage

Follow `Gyms.tsx` pattern for CRUD state management.

```typescript
// Source: Helix existing pattern in src/pages/Gyms.tsx
function TemplateManager() {
  const { templates, loading, error, createTemplate, updateTemplate, deleteTemplate } = useGroupTemplates()
  const {
    showForm,
    editingItem,
    isSubmitting,
    deleteConfirm,
    isFormVisible,
    openCreateForm,
    openEditForm,
    closeForm,
    openDeleteConfirm,
    closeDeleteConfirm,
    handleCreate,
    handleUpdate,
    handleDelete,
  } = useEntityPage<GroupTemplateWithExercises>()

  // ... render with PageHeader, FormCard, TemplateCard list
}
```

### Pattern 3: Full-Page Modal (not Sheet/Drawer)

Helix uses full-page fixed overlays for modals (see ExercisePicker).

```typescript
// Source: Helix existing pattern in src/components/sessions/ExercisePicker.tsx
function TemplateManager({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-lg font-semibold">Template di Gruppo</h1>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {/* Template list/form content */}
      </div>
    </div>
  )
}
```

### Pattern 4: Exercise Card with Parameters

Follow `SessionExerciseCard.tsx` for exercise parameters UI.

```typescript
// Source: Helix existing pattern in src/components/sessions/SessionExerciseCard.tsx
// Uses +/- stepper buttons for numeric values (sets, reps, weight, duration)
// Grid layout: 2 columns for parameters
// Notes as Textarea
// Reorder with ChevronUp/ChevronDown buttons
```

### Anti-Patterns to Avoid

- **Sheet/Drawer for template management:** The app uses full-screen modals. Sheet components are not installed and would break mobile UX consistency.
- **Separate route for templates:** CONTEXT.md specifies templates live under Sessions, accessed via button in header.
- **Copying exercises on apply:** CONTEXT.md specifies "linked" behavior with reference, not copy.
- **Allowing edit of template exercises in session:** Must be blocked - coach edits template instead.

## Schema Migration Required

**CRITICAL:** CONTEXT.md decision "Linked to template" requires adding `template_id` to `session_exercises`.

### Required Migration: 00000000000020_session_template_link.sql

```sql
-- Add template_id to session_exercises for linked template behavior
-- Exercises from a template reference the template, enabling:
-- 1. Blocking edit in session view (coach edits template instead)
-- 2. Template updates propagate to all sessions using it
-- 3. Block template deletion if any session uses it

ALTER TABLE public.session_exercises
ADD COLUMN template_id uuid REFERENCES public.group_templates(id) ON DELETE RESTRICT;

-- Index for finding sessions using a template
CREATE INDEX session_exercises_template_id_idx
  ON public.session_exercises(template_id)
  WHERE template_id IS NOT NULL;

-- Note: No RLS changes needed - session_exercises already has RLS
-- template_id is nullable - non-template exercises remain as-is
```

### TypeScript Type Updates

```typescript
// Update SessionExercise to include template_id
export interface SessionExercise {
  // ... existing fields
  template_id: string | null  // NEW: Reference to template
}

export interface SessionExerciseInsert {
  // ... existing fields
  template_id?: string | null  // NEW
}
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CRUD state management | Custom useState | `useEntityPage` hook | Already exists, handles all CRUD flows |
| Form validation | Manual validation | react-hook-form + zod | Already in use (GymForm pattern) |
| Exercise picker | New picker component | Existing `ExercisePicker` | Already handles search, tags, filtering |
| Numeric steppers | Custom implementation | `SessionExerciseCard` pattern | Already has +/- buttons for sets/reps/weight |
| Delete confirmation | Custom modal | `DeleteConfirmDialog` | Already exists with proper styling |

## Common Pitfalls

### Pitfall 1: Using Sheet/Drawer Components
**What goes wrong:** Installing Sheet component from shadcn/ui
**Why it happens:** shadcn docs recommend Sheet for mobile side panels
**How to avoid:** Use full-page overlay pattern like ExercisePicker
**Warning signs:** Adding @radix-ui/react-dialog or sheet.tsx to ui/

### Pitfall 2: Forgetting template_id Migration
**What goes wrong:** Apply template just copies exercises, no link
**Why it happens:** Missing schema preparation step
**How to avoid:** Plan 06-01 must include migration before hook
**Warning signs:** No way to identify template-sourced exercises

### Pitfall 3: Allowing Template Exercise Edit in Session
**What goes wrong:** Coach edits exercise parameters in session view
**Why it happens:** Reusing SessionExerciseCard without modification
**How to avoid:** Check `template_id` and disable editing if set
**Warning signs:** Template exercises editable in SessionDetail page

### Pitfall 4: Not Blocking Template Deletion
**What goes wrong:** Deleting template that sessions still use
**Why it happens:** DELETE RESTRICT handles DB level, but UI should prevent attempt
**How to avoid:** Check if any session_exercises reference template before delete
**Warning signs:** Error message from Supabase instead of user-friendly warning

### Pitfall 5: Inconsistent Navigation Pattern
**What goes wrong:** Templates accessible from different places, confusing UX
**Why it happens:** Adding route instead of button in Sessions header
**How to avoid:** Single entry point: "Template" button in Sessions page PageHeader
**Warning signs:** Template link in bottom nav or multiple access points

## Code Examples

### Example 1: useGroupTemplates Hook Structure

```typescript
// src/hooks/useGroupTemplates.ts
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type {
  GroupTemplate,
  GroupTemplateInsert,
  GroupTemplateUpdate,
  GroupTemplateWithExercises,
  GroupTemplateExercise,
  GroupTemplateExerciseInsert,
  GroupTemplateExerciseUpdate,
} from '@/types'

export function useGroupTemplates() {
  const [templates, setTemplates] = useState<GroupTemplateWithExercises[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('group_templates')
      .select(`
        *,
        exercises:group_template_exercises(
          *,
          exercise:exercises(*)
        )
      `)
      .order('name', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      // Sort exercises by order_index
      const templatesWithSortedExercises = (data || []).map((template) => ({
        ...template,
        exercises: template.exercises?.sort(
          (a: GroupTemplateExercise, b: GroupTemplateExercise) =>
            a.order_index - b.order_index
        ),
      }))
      setTemplates(templatesWithSortedExercises)
    }
    setLoading(false)
  }, [])

  // ... CRUD operations following useGyms/useSessions patterns
}
```

### Example 2: Apply Template to Session

```typescript
// In useSessions.ts or useGroupTemplates.ts
const applyTemplateToSession = async (
  sessionId: string,
  templateId: string,
  mode: 'add' | 'replace'
) => {
  // Get template exercises
  const { data: template } = await supabase
    .from('group_templates')
    .select(`
      *,
      exercises:group_template_exercises(
        *,
        exercise:exercises(*)
      )
    `)
    .eq('id', templateId)
    .single()

  if (!template?.exercises) return null

  // If replace mode, delete existing group exercises
  if (mode === 'replace') {
    await supabase
      .from('session_exercises')
      .delete()
      .eq('session_id', sessionId)
      .eq('is_group', true)
  }

  // Get current max order_index
  const { data: existing } = await supabase
    .from('session_exercises')
    .select('order_index')
    .eq('session_id', sessionId)
    .order('order_index', { ascending: false })
    .limit(1)

  const startIndex = (existing?.[0]?.order_index ?? -1) + 1

  // Insert template exercises as session exercises with template_id link
  const exercisesToInsert = template.exercises.map((ex, idx) => ({
    session_id: sessionId,
    exercise_id: ex.exercise_id,
    template_id: templateId,  // Link to template!
    order_index: startIndex + idx,
    sets: ex.sets,
    reps: ex.reps,
    weight_kg: ex.weight_kg,
    duration_seconds: ex.duration_seconds,
    notes: ex.notes,
    is_group: true,
    completed: false,
    skipped: false,
  }))

  const { error } = await supabase
    .from('session_exercises')
    .insert(exercisesToInsert)

  return !error
}
```

### Example 3: Check Template In Use (Block Deletion)

```typescript
// In useGroupTemplates.ts
const canDeleteTemplate = async (templateId: string): Promise<boolean> => {
  const { count } = await supabase
    .from('session_exercises')
    .select('id', { count: 'exact', head: true })
    .eq('template_id', templateId)

  return count === 0
}

const deleteTemplate = async (id: string): Promise<boolean> => {
  const canDelete = await canDeleteTemplate(id)
  if (!canDelete) {
    setError('Impossibile eliminare: template usato in sessioni esistenti')
    return false
  }

  const { error: deleteError } = await supabase
    .from('group_templates')
    .delete()
    .eq('id', id)

  if (deleteError) {
    setError(deleteError.message)
    return false
  }

  setTemplates((prev) => prev.filter((t) => t.id !== id))
  return true
}
```

## UI Recommendations (Claude's Discretion Areas)

### Navigation Pattern: Full-Page View

**Recommendation:** Full-page overlay (like ExercisePicker)

Reasons:
1. Consistent with existing modal patterns in Helix
2. Template management involves list + form + exercise management - needs space
3. Sheet/Drawer not installed, would need new component
4. Mobile-first: full-page works better than side drawer on phones

### Template List Layout: Card List

**Recommendation:** Vertical card list (like Gyms page)

Reasons:
1. Each template needs to show name + 2-3 exercise names preview
2. Need space for edit/delete actions
3. Consistent with other list pages (Gyms, Sessions)
4. Cards scale well from phone to tablet

### Exercise Parameters: All Four

**Recommendation:** Include sets, reps, weight_kg, duration_seconds

Reasons:
1. Mirrors session_exercises exactly
2. Coach may want some exercises with time-based (Pilates) or rep-based (weights)
3. All nullable - coach only fills what's relevant
4. Consistent UI with SessionExerciseCard

### Exercise Reordering: Button-Based

**Recommendation:** Up/Down buttons (like SessionExerciseCard)

Reasons:
1. Existing pattern in codebase
2. Works well on touch devices
3. No need for drag-drop library
4. Template lists are typically small (5-15 exercises)

### Deletion UX: Confirm Dialog

**Recommendation:** DeleteConfirmDialog (existing component)

Reasons:
1. Already exists and styled appropriately
2. Consistent with Gyms, Sessions, Exercises pages
3. With additional check: show different message if template in use

## Open Questions

1. **Template exercise sync behavior**
   - What we know: Session exercises link to template via template_id
   - What's unclear: When template is edited, do existing session exercises update?
   - Recommendation: For Phase 6, exercises are linked by reference - editing template parameters should update all linked session exercises. If this is too complex, defer to Phase 7.

2. **Add vs Replace UX when applying**
   - What we know: CONTEXT.md says prompt coach to choose "add" or "replace"
   - What's unclear: Exact UI for this choice (dialog, buttons, dropdown?)
   - Recommendation: Simple dialog with two buttons: "Aggiungi" and "Sostituisci"

## Sources

### Primary (HIGH confidence)
- Helix codebase: `src/hooks/useSessions.ts`, `src/hooks/useGyms.ts`
- Helix codebase: `src/pages/Gyms.tsx`, `src/pages/Sessions.tsx`
- Helix codebase: `src/components/sessions/SessionExerciseCard.tsx`
- Helix codebase: `src/components/sessions/ExercisePicker.tsx`
- Context7 `/websites/ui_shadcn` - Sheet/Drawer patterns (determined not to use)
- Phase 5 RESEARCH.md - Database schema and types

### Secondary (MEDIUM confidence)
- Context7 `/supabase/supabase-js` - CRUD patterns

## Metadata

**Confidence breakdown:**
- Hook patterns: HIGH - mirrors existing useSessions/useGyms exactly
- UI components: HIGH - reuses existing shared components
- Schema migration: HIGH - straightforward column addition
- Navigation pattern: HIGH - follows existing full-page modal pattern

**Research date:** 2026-02-01
**Valid until:** 60 days (stable UI patterns)

---
*Phase research: 2026-02-01*
