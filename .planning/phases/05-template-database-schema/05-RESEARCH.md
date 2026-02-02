# Phase 5: Template Database Schema - Research

**Researched:** 2026-01-30
**Domain:** PostgreSQL schema migration for group exercise templates
**Confidence:** HIGH

## Summary

Phase 5 creates the database foundation for reusable group exercise templates. Two tables are needed: `group_templates` (template metadata with name, user_id, timestamps) and `group_template_exercises` (template exercises with parameters). The schema closely mirrors the existing `session_exercises` pattern, making implementation straightforward.

Key decisions from CONTEXT.md:
- Parameters: sets, reps, weight_kg, duration_seconds, notes (all optional)
- Metadata: name only (not unique), hard delete, gym-agnostic
- Ordering: order_index integer, no grouping, duplicate exercises allowed
- Scope: Private to coach (RLS via user_id), no system templates

**Primary recommendation:** Single migration file creating both tables with RLS policies, followed by TypeScript type exports.

## Standard Stack

No new dependencies. Uses existing Supabase migration pattern.

| Component | Version | Purpose |
|-----------|---------|---------|
| PostgreSQL | 15+ | Database (via Supabase) |
| Supabase CLI | Latest | Migration management |
| TypeScript | 5.x | Type definitions |

## Schema Design

### Table 1: group_templates

```sql
create table public.group_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
```

**Design rationale:**
- `user_id` references auth.users directly for simple RLS (same as gyms, clients)
- `name` is free text, not unique (per CONTEXT.md decision)
- Standard timestamps with updated_at trigger

### Table 2: group_template_exercises

```sql
create table public.group_template_exercises (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.group_templates(id) on delete cascade not null,
  exercise_id uuid references public.exercises(id) on delete restrict not null,
  order_index integer not null default 0,
  sets integer,
  reps integer,
  weight_kg numeric(6,2),
  duration_seconds integer,
  notes text,
  created_at timestamp with time zone default now()
);
```

**Design rationale:**
- `template_id` with cascade delete (deleting template removes all its exercises)
- `exercise_id` with restrict delete (can't delete exercise used in templates)
- Parameters mirror `session_exercises` exactly
- All parameters nullable (template can specify some, none, or all)
- No `updated_at` needed (exercises are typically replaced, not edited)

### Order Index Strategy (Claude's Discretion)

**Recommendation: Contiguous (1, 2, 3)**

Reasons:
1. Matches existing `session_exercises` pattern (order_index starts at 0)
2. Frontend reorder operations regenerate all indexes anyway
3. Gapped strategy (10, 20, 30) adds complexity without benefit for this use case
4. Templates are small lists (typically 5-15 exercises)

### Last Used Timestamp (Claude's Discretion)

**Recommendation: Skip**

Reasons:
1. Per CONTEXT.md, "probably skip for simplicity" guidance
2. Would require updating template on every session creation
3. Templates list can sort by updated_at if recency matters
4. Can be added later if needed (non-breaking change)

### Additional Indexes (Claude's Discretion)

**Recommendation: Add these indexes**

```sql
-- Primary access pattern: list templates for a user
create index group_templates_user_id_idx on public.group_templates(user_id);

-- Access pattern: list exercises for a template, ordered
create index group_template_exercises_template_id_idx
  on public.group_template_exercises(template_id);
create index group_template_exercises_order_idx
  on public.group_template_exercises(template_id, order_index);

-- Access pattern: find templates using a specific exercise
create index group_template_exercises_exercise_id_idx
  on public.group_template_exercises(exercise_id);
```

**Rationale:**
- Matches index patterns from `session_exercises`
- `user_id` index critical for RLS performance
- Composite `(template_id, order_index)` supports ordered queries
- `exercise_id` index supports "find templates using this exercise" queries

## RLS Policies

### Pattern Choice: Direct user_id vs Join

The project uses two RLS patterns:

1. **Direct ownership** (gyms, clients, lumio_repositories):
   ```sql
   using (auth.uid() = user_id)
   ```

2. **Join-based ownership** (session_exercises, goal_history):
   ```sql
   using (exists (select 1 from parent_table where ...))
   ```

**Recommendation for templates: Direct ownership**

`group_templates` has direct `user_id` column, so use simple pattern:
```sql
create policy "Users can view their own templates"
  on public.group_templates for select using (auth.uid() = user_id);
```

For `group_template_exercises`, use optimized join pattern (per Context7 research):
```sql
create policy "Users can view their template exercises"
  on public.group_template_exercises for select
  using (
    template_id in (
      select id from public.group_templates
      where user_id = (select auth.uid())
    )
  );
```

**Why optimized join:**
- Context7 confirms: `column in (select ...)` is faster than `exists (select ... where join)`
- Avoids row-by-row correlation which degrades performance

### Full RLS Policies

**group_templates:**
```sql
alter table public.group_templates enable row level security;

create policy "Users can view their own templates"
  on public.group_templates for select using (auth.uid() = user_id);
create policy "Users can insert their own templates"
  on public.group_templates for insert with check (auth.uid() = user_id);
create policy "Users can update their own templates"
  on public.group_templates for update using (auth.uid() = user_id);
create policy "Users can delete their own templates"
  on public.group_templates for delete using (auth.uid() = user_id);
```

**group_template_exercises:**
```sql
alter table public.group_template_exercises enable row level security;

create policy "Users can view their template exercises"
  on public.group_template_exercises for select
  using (template_id in (select id from public.group_templates where user_id = (select auth.uid())));
create policy "Users can insert their template exercises"
  on public.group_template_exercises for insert
  with check (template_id in (select id from public.group_templates where user_id = (select auth.uid())));
create policy "Users can update their template exercises"
  on public.group_template_exercises for update
  using (template_id in (select id from public.group_templates where user_id = (select auth.uid())));
create policy "Users can delete their template exercises"
  on public.group_template_exercises for delete
  using (template_id in (select id from public.group_templates where user_id = (select auth.uid())));
```

## TypeScript Types

Following existing patterns in `src/shared/types/index.ts`:

```typescript
// Group Templates

export interface GroupTemplate {
  id: string
  user_id: string
  name: string
  created_at: string
  updated_at: string
}

export interface GroupTemplateInsert {
  name: string
}

export interface GroupTemplateUpdate extends Partial<GroupTemplateInsert> {}

export interface GroupTemplateExercise {
  id: string
  template_id: string
  exercise_id: string
  order_index: number
  sets: number | null
  reps: number | null
  weight_kg: number | null
  duration_seconds: number | null
  notes: string | null
  created_at: string
}

export interface GroupTemplateExerciseInsert {
  template_id: string
  exercise_id: string
  order_index?: number
  sets?: number | null
  reps?: number | null
  weight_kg?: number | null
  duration_seconds?: number | null
  notes?: string | null
}

export interface GroupTemplateExerciseUpdate
  extends Partial<Omit<GroupTemplateExerciseInsert, 'template_id'>> {}

export interface GroupTemplateWithExercises extends GroupTemplate {
  exercises?: GroupTemplateExerciseWithDetails[]
}

export interface GroupTemplateExerciseWithDetails extends GroupTemplateExercise {
  exercise?: ExerciseWithDetails
}
```

**Pattern notes:**
- `Insert` types omit auto-generated fields (id, timestamps, user_id)
- `Update` types are partial and omit foreign keys
- `WithDetails` types include joined data for queries

## Migration File

### Naming Convention

Project uses sequential numbering: `00000000000019_group_templates.sql`

(Last migration is 00000000000018_group_rpc.sql)

### Complete Migration

```sql
-- Group Templates - Milestone v1.1
-- Reusable templates for group exercise sessions

-- ============================================
-- GROUP TEMPLATES
-- ============================================

create table public.group_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index group_templates_user_id_idx on public.group_templates(user_id);

alter table public.group_templates enable row level security;

create policy "Users can view their own templates"
  on public.group_templates for select using (auth.uid() = user_id);
create policy "Users can insert their own templates"
  on public.group_templates for insert with check (auth.uid() = user_id);
create policy "Users can update their own templates"
  on public.group_templates for update using (auth.uid() = user_id);
create policy "Users can delete their own templates"
  on public.group_templates for delete using (auth.uid() = user_id);

-- Trigger for updated_at
create trigger update_group_templates_updated_at
  before update on public.group_templates for each row execute function public.update_updated_at_column();

-- ============================================
-- GROUP TEMPLATE EXERCISES
-- ============================================

create table public.group_template_exercises (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.group_templates(id) on delete cascade not null,
  exercise_id uuid references public.exercises(id) on delete restrict not null,
  order_index integer not null default 0,
  sets integer,
  reps integer,
  weight_kg numeric(6,2),
  duration_seconds integer,
  notes text,
  created_at timestamp with time zone default now()
);

create index group_template_exercises_template_id_idx on public.group_template_exercises(template_id);
create index group_template_exercises_order_idx on public.group_template_exercises(template_id, order_index);
create index group_template_exercises_exercise_id_idx on public.group_template_exercises(exercise_id);

alter table public.group_template_exercises enable row level security;

create policy "Users can view their template exercises"
  on public.group_template_exercises for select
  using (template_id in (select id from public.group_templates where user_id = (select auth.uid())));
create policy "Users can insert their template exercises"
  on public.group_template_exercises for insert
  with check (template_id in (select id from public.group_templates where user_id = (select auth.uid())));
create policy "Users can update their template exercises"
  on public.group_template_exercises for update
  using (template_id in (select id from public.group_templates where user_id = (select auth.uid())));
create policy "Users can delete their template exercises"
  on public.group_template_exercises for delete
  using (template_id in (select id from public.group_templates where user_id = (select auth.uid())));
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID generation | Custom UUID function | `gen_random_uuid()` | PostgreSQL native, fast, secure |
| Timestamp updates | Manual trigger | Existing `update_updated_at_column()` function | Already exists in project |
| RLS policies | Custom auth checks | Standard `auth.uid()` pattern | Supabase optimized |

## Common Pitfalls

### Pitfall 1: Destructive Migration
**What goes wrong:** Using DROP TABLE or DROP COLUMN
**Why it happens:** Refactoring existing schema
**How to avoid:** This is a new feature - only CREATE statements needed
**Warning signs:** Any DROP in migration file

### Pitfall 2: Slow RLS on Join Tables
**What goes wrong:** Using `exists (select ... where join)` pattern
**Why it happens:** Copying from session_exercises without optimization
**How to avoid:** Use `column in (select ...)` pattern for child tables
**Warning signs:** Query performance issues on template_exercises table

### Pitfall 3: Missing Index on user_id
**What goes wrong:** Slow queries when listing user's templates
**Why it happens:** Assuming RLS is enough
**How to avoid:** Always add index on columns used in RLS policies
**Warning signs:** Template list loading slowly

### Pitfall 4: Wrong ON DELETE for exercise_id
**What goes wrong:** Using CASCADE instead of RESTRICT
**Why it happens:** Copying CASCADE from template_id reference
**How to avoid:** Use RESTRICT - coach must remove exercise from templates first
**Warning signs:** Exercise deletion silently removes template data

### Pitfall 5: Forgetting to Update CLAUDE.md
**What goes wrong:** Database documentation becomes stale
**Why it happens:** Focus on code, forget docs
**How to avoid:** Project rule: "Update CLAUDE.md after migrations"
**Warning signs:** CLAUDE.md Database section doesn't list new tables

## Verification Criteria

- [ ] Migration runs without error locally (`npm run supabase:reset`)
- [ ] Both tables created with correct columns
- [ ] All indexes exist (verify in Supabase Studio)
- [ ] RLS enabled on both tables
- [ ] Can insert template as authenticated user
- [ ] Can insert template exercise referencing user's template
- [ ] Cannot view another coach's templates (RLS test)
- [ ] Cannot insert exercise into another coach's template (RLS test)
- [ ] TypeScript types compile without error
- [ ] CLAUDE.md updated with new tables

## Sources

### Primary (HIGH confidence)
- `/supabase/supabase` Context7 - RLS policy patterns, join optimization
- `/supabase/cli` Context7 - Migration management
- Existing Helix migrations in `supabase/migrations/`
- Project CONTEXT.md decisions

### Secondary (MEDIUM confidence)
- PostgreSQL documentation for index types

### Project-specific (HIGH confidence)
- `00000000000000_initial_schema.sql` - session_exercises pattern
- `00000000000006_lumio_repositories.sql` - direct ownership RLS pattern
- `00000000000007_lumio_cards.sql` - join-based RLS pattern
- `src/shared/types/index.ts` - TypeScript type patterns

## Metadata

**Confidence breakdown:**
- Schema design: HIGH - mirrors existing patterns exactly
- RLS policies: HIGH - verified with Context7 best practices
- TypeScript types: HIGH - follows existing conventions
- Index strategy: HIGH - matches session_exercises pattern

**Research date:** 2026-01-30
**Valid until:** 90 days (stable database patterns)

---
*Phase research: 2026-01-30*
