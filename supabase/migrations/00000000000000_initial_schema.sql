-- Fitness Coach Assistant - Consolidated Schema
-- This represents the complete database schema

-- ============================================
-- CLIENTS
-- ============================================

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  first_name text not null,
  last_name text not null,
  birth_date date,
  age_years integer,
  current_goal text,
  physical_notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint birth_date_or_age_required check (birth_date is not null or age_years is not null),
  constraint age_years_positive check (age_years is null or age_years > 0)
);

alter table public.clients enable row level security;

create policy "Users can view their own clients"
  on public.clients for select using (auth.uid() = user_id);
create policy "Users can insert their own clients"
  on public.clients for insert with check (auth.uid() = user_id);
create policy "Users can update their own clients"
  on public.clients for update using (auth.uid() = user_id);
create policy "Users can delete their own clients"
  on public.clients for delete using (auth.uid() = user_id);

-- ============================================
-- GOAL HISTORY
-- ============================================

create table public.goal_history (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade not null,
  goal text not null,
  started_at timestamp with time zone default now(),
  ended_at timestamp with time zone
);

alter table public.goal_history enable row level security;

create policy "Users can view goal history of their clients"
  on public.goal_history for select
  using (exists (select 1 from public.clients where clients.id = goal_history.client_id and clients.user_id = auth.uid()));
create policy "Users can insert goal history for their clients"
  on public.goal_history for insert
  with check (exists (select 1 from public.clients where clients.id = goal_history.client_id and clients.user_id = auth.uid()));
create policy "Users can update goal history of their clients"
  on public.goal_history for update
  using (exists (select 1 from public.clients where clients.id = goal_history.client_id and clients.user_id = auth.uid()));
create policy "Users can delete goal history of their clients"
  on public.goal_history for delete
  using (exists (select 1 from public.clients where clients.id = goal_history.client_id and clients.user_id = auth.uid()));

-- ============================================
-- EXERCISES
-- ============================================

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamp with time zone default now()
);

alter table public.exercises enable row level security;

create policy "Users can view default and own exercises"
  on public.exercises for select using (user_id is null or auth.uid() = user_id);
create policy "Users can insert their own exercises"
  on public.exercises for insert with check (auth.uid() = user_id);
create policy "Users can update their own exercises"
  on public.exercises for update using (auth.uid() = user_id);
create policy "Users can delete their own exercises"
  on public.exercises for delete using (auth.uid() = user_id);

-- ============================================
-- EXERCISE BLOCKS
-- ============================================

create table public.exercise_blocks (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid references public.exercises(id) on delete cascade not null,
  image_url text,
  description text,
  order_index integer default 0,
  created_at timestamp with time zone default now()
);

create index exercise_blocks_exercise_id_idx on public.exercise_blocks(exercise_id);

alter table public.exercise_blocks enable row level security;

create policy "Users can view blocks of accessible exercises"
  on public.exercise_blocks for select
  using (exists (select 1 from public.exercises where exercises.id = exercise_blocks.exercise_id and (exercises.user_id is null or exercises.user_id = auth.uid())));
create policy "Users can insert blocks for their exercises"
  on public.exercise_blocks for insert
  with check (exists (select 1 from public.exercises where exercises.id = exercise_blocks.exercise_id and exercises.user_id = auth.uid()));
create policy "Users can update blocks of their exercises"
  on public.exercise_blocks for update
  using (exists (select 1 from public.exercises where exercises.id = exercise_blocks.exercise_id and exercises.user_id = auth.uid()));
create policy "Users can delete blocks of their exercises"
  on public.exercise_blocks for delete
  using (exists (select 1 from public.exercises where exercises.id = exercise_blocks.exercise_id and exercises.user_id = auth.uid()));

-- ============================================
-- EXERCISE TAGS
-- ============================================

create table public.exercise_tags (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid references public.exercises(id) on delete cascade not null,
  tag text not null,
  created_at timestamp with time zone default now()
);

create index exercise_tags_exercise_id_idx on public.exercise_tags(exercise_id);
create index exercise_tags_tag_idx on public.exercise_tags(tag);

alter table public.exercise_tags enable row level security;

create policy "Users can view tags of accessible exercises"
  on public.exercise_tags for select
  using (exists (select 1 from public.exercises where exercises.id = exercise_tags.exercise_id and (exercises.user_id is null or exercises.user_id = auth.uid())));
create policy "Users can insert tags for their exercises"
  on public.exercise_tags for insert
  with check (exists (select 1 from public.exercises where exercises.id = exercise_tags.exercise_id and exercises.user_id = auth.uid()));
create policy "Users can update tags of their exercises"
  on public.exercise_tags for update
  using (exists (select 1 from public.exercises where exercises.id = exercise_tags.exercise_id and exercises.user_id = auth.uid()));
create policy "Users can delete tags of their exercises"
  on public.exercise_tags for delete
  using (exists (select 1 from public.exercises where exercises.id = exercise_tags.exercise_id and exercises.user_id = auth.uid()));

-- ============================================
-- GYMS
-- ============================================

create table public.gyms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  address text,
  description text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.gyms enable row level security;

create policy "Users can view their own gyms"
  on public.gyms for select using (auth.uid() = user_id);
create policy "Users can insert their own gyms"
  on public.gyms for insert with check (auth.uid() = user_id);
create policy "Users can update their own gyms"
  on public.gyms for update using (auth.uid() = user_id);
create policy "Users can delete their own gyms"
  on public.gyms for delete using (auth.uid() = user_id);

-- ============================================
-- SESSIONS
-- ============================================

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade not null,
  gym_id uuid references public.gyms(id) on delete set null,
  session_date date not null default current_date,
  status text not null default 'planned' check (status in ('planned', 'completed')),
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index sessions_client_id_idx on public.sessions(client_id);
create index sessions_gym_id_idx on public.sessions(gym_id);
create index sessions_session_date_idx on public.sessions(session_date);
create index sessions_status_idx on public.sessions(status);

alter table public.sessions enable row level security;

create policy "Users can view sessions of their clients"
  on public.sessions for select
  using (exists (select 1 from public.clients where clients.id = sessions.client_id and clients.user_id = auth.uid()));
create policy "Users can insert sessions for their clients"
  on public.sessions for insert
  with check (exists (select 1 from public.clients where clients.id = sessions.client_id and clients.user_id = auth.uid()));
create policy "Users can update sessions of their clients"
  on public.sessions for update
  using (exists (select 1 from public.clients where clients.id = sessions.client_id and clients.user_id = auth.uid()));
create policy "Users can delete sessions of their clients"
  on public.sessions for delete
  using (exists (select 1 from public.clients where clients.id = sessions.client_id and clients.user_id = auth.uid()));

-- ============================================
-- SESSION EXERCISES
-- ============================================

create table public.session_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions(id) on delete cascade not null,
  exercise_id uuid references public.exercises(id) on delete restrict not null,
  order_index integer not null default 0,
  sets integer,
  reps integer,
  weight_kg numeric(6,2),
  duration_seconds integer,
  notes text,
  created_at timestamp with time zone default now()
);

create index session_exercises_session_id_idx on public.session_exercises(session_id);
create index session_exercises_exercise_id_idx on public.session_exercises(exercise_id);
create index session_exercises_order_idx on public.session_exercises(session_id, order_index);

alter table public.session_exercises enable row level security;

create policy "Users can view exercises of their sessions"
  on public.session_exercises for select
  using (exists (select 1 from public.sessions s join public.clients c on c.id = s.client_id where s.id = session_exercises.session_id and c.user_id = auth.uid()));
create policy "Users can insert exercises in their sessions"
  on public.session_exercises for insert
  with check (exists (select 1 from public.sessions s join public.clients c on c.id = s.client_id where s.id = session_exercises.session_id and c.user_id = auth.uid()));
create policy "Users can update exercises of their sessions"
  on public.session_exercises for update
  using (exists (select 1 from public.sessions s join public.clients c on c.id = s.client_id where s.id = session_exercises.session_id and c.user_id = auth.uid()));
create policy "Users can delete exercises of their sessions"
  on public.session_exercises for delete
  using (exists (select 1 from public.sessions s join public.clients c on c.id = s.client_id where s.id = session_exercises.session_id and c.user_id = auth.uid()));

-- ============================================
-- AI CONVERSATIONS
-- ============================================

create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  client_id uuid references public.clients(id) on delete cascade not null,
  title text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index ai_conversations_user_id_idx on public.ai_conversations(user_id);
create index ai_conversations_client_id_idx on public.ai_conversations(client_id);
create index ai_conversations_created_at_idx on public.ai_conversations(created_at desc);

alter table public.ai_conversations enable row level security;

create policy "Users can view their own conversations"
  on public.ai_conversations for select using (auth.uid() = user_id);
create policy "Users can insert their own conversations"
  on public.ai_conversations for insert with check (auth.uid() = user_id);
create policy "Users can update their own conversations"
  on public.ai_conversations for update using (auth.uid() = user_id);
create policy "Users can delete their own conversations"
  on public.ai_conversations for delete using (auth.uid() = user_id);

-- ============================================
-- AI MESSAGES
-- ============================================

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.ai_conversations(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamp with time zone default now()
);

create index ai_messages_conversation_id_idx on public.ai_messages(conversation_id);
create index ai_messages_created_at_idx on public.ai_messages(created_at);

alter table public.ai_messages enable row level security;

create policy "Users can view messages of their conversations"
  on public.ai_messages for select
  using (exists (select 1 from public.ai_conversations where ai_conversations.id = ai_messages.conversation_id and ai_conversations.user_id = auth.uid()));
create policy "Users can insert messages in their conversations"
  on public.ai_messages for insert
  with check (exists (select 1 from public.ai_conversations where ai_conversations.id = ai_messages.conversation_id and ai_conversations.user_id = auth.uid()));
create policy "Users can update messages of their conversations"
  on public.ai_messages for update
  using (exists (select 1 from public.ai_conversations where ai_conversations.id = ai_messages.conversation_id and ai_conversations.user_id = auth.uid()));
create policy "Users can delete messages of their conversations"
  on public.ai_messages for delete
  using (exists (select 1 from public.ai_conversations where ai_conversations.id = ai_messages.conversation_id and ai_conversations.user_id = auth.uid()));

-- ============================================
-- AI GENERATED PLANS
-- ============================================

create table public.ai_generated_plans (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.ai_conversations(id) on delete cascade not null,
  session_id uuid references public.sessions(id) on delete set null,
  plan_json jsonb not null,
  accepted boolean default false,
  created_at timestamp with time zone default now()
);

create index ai_generated_plans_conversation_id_idx on public.ai_generated_plans(conversation_id);
create index ai_generated_plans_session_id_idx on public.ai_generated_plans(session_id);

alter table public.ai_generated_plans enable row level security;

create policy "Users can view plans of their conversations"
  on public.ai_generated_plans for select
  using (exists (select 1 from public.ai_conversations where ai_conversations.id = ai_generated_plans.conversation_id and ai_conversations.user_id = auth.uid()));
create policy "Users can insert plans in their conversations"
  on public.ai_generated_plans for insert
  with check (exists (select 1 from public.ai_conversations where ai_conversations.id = ai_generated_plans.conversation_id and ai_conversations.user_id = auth.uid()));
create policy "Users can update plans of their conversations"
  on public.ai_generated_plans for update
  using (exists (select 1 from public.ai_conversations where ai_conversations.id = ai_generated_plans.conversation_id and ai_conversations.user_id = auth.uid()));
create policy "Users can delete plans of their conversations"
  on public.ai_generated_plans for delete
  using (exists (select 1 from public.ai_conversations where ai_conversations.id = ai_generated_plans.conversation_id and ai_conversations.user_id = auth.uid()));

-- ============================================
-- COACH AI SETTINGS
-- ============================================

create table public.coach_ai_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  openai_api_key text,
  anthropic_api_key text,
  preferred_provider text not null default 'openai' check (preferred_provider in ('openai', 'anthropic')),
  preferred_model text not null default 'gpt-4o',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index coach_ai_settings_user_id_idx on public.coach_ai_settings(user_id);

alter table public.coach_ai_settings enable row level security;

create policy "Users can view their own AI settings"
  on public.coach_ai_settings for select using (auth.uid() = user_id);
create policy "Users can insert their own AI settings"
  on public.coach_ai_settings for insert with check (auth.uid() = user_id);
create policy "Users can update their own AI settings"
  on public.coach_ai_settings for update using (auth.uid() = user_id);
create policy "Users can delete their own AI settings"
  on public.coach_ai_settings for delete using (auth.uid() = user_id);

-- ============================================
-- TRIGGERS
-- ============================================

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_clients_updated_at
  before update on public.clients for each row execute function public.update_updated_at_column();
create trigger update_gyms_updated_at
  before update on public.gyms for each row execute function public.update_updated_at_column();
create trigger update_sessions_updated_at
  before update on public.sessions for each row execute function public.update_updated_at_column();
create trigger update_ai_conversations_updated_at
  before update on public.ai_conversations for each row execute function public.update_updated_at_column();
create trigger update_coach_ai_settings_updated_at
  before update on public.coach_ai_settings for each row execute function public.update_updated_at_column();

-- ============================================
-- STORAGE BUCKET
-- ============================================

insert into storage.buckets (id, name, public)
values ('exercise-images', 'exercise-images', true)
on conflict (id) do nothing;

-- Storage policies (drop if exist to make idempotent)
drop policy if exists "Public read access for exercise images" on storage.objects;
drop policy if exists "Authenticated users can upload exercise images" on storage.objects;
drop policy if exists "Users can update own exercise images" on storage.objects;
drop policy if exists "Users can delete own exercise images" on storage.objects;

create policy "Public read access for exercise images"
  on storage.objects for select using (bucket_id = 'exercise-images');
create policy "Authenticated users can upload exercise images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'exercise-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users can update own exercise images"
  on storage.objects for update to authenticated
  using (bucket_id = 'exercise-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users can delete own exercise images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'exercise-images' and (storage.foldername(name))[1] = auth.uid()::text);
