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
