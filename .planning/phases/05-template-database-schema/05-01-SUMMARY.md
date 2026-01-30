---
phase: 05-template-database-schema
plan: 01
subsystem: database
tags: [postgresql, rls, migration, templates]
dependency-graph:
  requires: []
  provides: [group_templates table, group_template_exercises table, TypeScript types]
  affects: [phase-06 CRUD, phase-07 MCP integration]
tech-stack:
  added: []
  patterns: [join-based RLS with optimized subquery]
key-files:
  created:
    - supabase/migrations/00000000000019_group_templates.sql
  modified:
    - src/shared/types/index.ts
    - CLAUDE.md
decisions:
  - key: rls-pattern
    choice: "Optimized subquery: column IN (select ...)"
    rationale: "Context7 confirms better performance than EXISTS with join"
  - key: exercise-fk
    choice: "ON DELETE RESTRICT"
    rationale: "Coach must remove exercise from templates before deleting"
  - key: order-index
    choice: "Contiguous integers starting at 0"
    rationale: "Matches session_exercises pattern, simple for frontend reorder"
metrics:
  duration: 2m
  completed: 2026-01-30
---

# Phase 5 Plan 1: Template Database Schema Summary

**One-liner:** PostgreSQL tables for group exercise templates with RLS and optimized join-based policies.

## What Was Built

### Database Schema

**Table: group_templates**
- `id` uuid primary key
- `user_id` uuid references auth.users (CASCADE)
- `name` text not null
- `created_at`, `updated_at` timestamps
- Index on user_id for RLS performance
- Trigger for automatic updated_at

**Table: group_template_exercises**
- `id` uuid primary key
- `template_id` uuid references group_templates (CASCADE)
- `exercise_id` uuid references exercises (RESTRICT)
- `order_index` integer not null default 0
- Optional params: sets, reps, weight_kg, duration_seconds, notes
- `created_at` timestamp
- Indexes: template_id, (template_id, order_index), exercise_id

### RLS Policies (8 total)

**group_templates (4 policies):**
- Direct ownership pattern: `auth.uid() = user_id`
- SELECT, INSERT, UPDATE, DELETE

**group_template_exercises (4 policies):**
- Optimized join pattern: `template_id IN (select id from group_templates where user_id = (select auth.uid()))`
- SELECT, INSERT (with check), UPDATE, DELETE

### TypeScript Types

Exported from `src/shared/types/index.ts`:
- `GroupTemplate`, `GroupTemplateInsert`, `GroupTemplateUpdate`
- `GroupTemplateExercise`, `GroupTemplateExerciseInsert`, `GroupTemplateExerciseUpdate`
- `GroupTemplateWithExercises`, `GroupTemplateExerciseWithDetails`

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| RLS pattern for child table | Optimized subquery | Context7 confirms `IN (select ...)` outperforms `EXISTS` with join |
| exercise_id foreign key | ON DELETE RESTRICT | Coach must explicitly remove exercise from templates before deleting |
| Order index strategy | Contiguous (0, 1, 2) | Matches session_exercises, simple for frontend reorder operations |
| last_used_at field | Skipped | Per CONTEXT.md guidance - can sort by updated_at if needed |

## Deviations from Plan

None - plan executed exactly as written.

## Commit Log

| Commit | Type | Description |
|--------|------|-------------|
| fdd6730 | feat | Add group_templates database schema |
| 1b5ae76 | feat | Add TypeScript types and update docs |

## Verification Results

- [x] Migration runs without error
- [x] Both tables exist with correct columns
- [x] 4 custom indexes created (plus 2 PKs)
- [x] RLS enabled on both tables (8 policies total)
- [x] TypeScript compiles without errors
- [x] CLAUDE.md updated with new tables

## Next Phase Readiness

**Ready for Phase 6 (Template CRUD Operations):**
- Tables exist and accessible via Supabase client
- TypeScript types ready for use in hooks and components
- RLS enforced - queries will automatically filter by user

**API patterns to use:**
```typescript
// Create template
supabase.from('group_templates').insert({ name: 'My Template' })

// Get templates with exercises
supabase.from('group_templates')
  .select('*, exercises:group_template_exercises(*, exercise:exercises(*))')

// Delete cascade works automatically
supabase.from('group_templates').delete().eq('id', templateId)
```

---
*Summary generated: 2026-01-30*
