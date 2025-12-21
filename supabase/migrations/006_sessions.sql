-- Sessions Schema
-- Training sessions for clients with exercises

-- Sessions table
create table public.sessions (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references public.clients(id) on delete cascade not null,
  gym_id uuid references public.gyms(id) on delete set null,
  session_date date not null default current_date,
  status text not null default 'planned' check (status in ('planned', 'completed')),
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Session exercises table
create table public.session_exercises (
  id uuid primary key default uuid_generate_v4(),
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

-- Indexes for performance
create index sessions_client_id_idx on public.sessions(client_id);
create index sessions_gym_id_idx on public.sessions(gym_id);
create index sessions_session_date_idx on public.sessions(session_date);
create index sessions_status_idx on public.sessions(status);
create index session_exercises_session_id_idx on public.session_exercises(session_id);
create index session_exercises_exercise_id_idx on public.session_exercises(exercise_id);
create index session_exercises_order_idx on public.session_exercises(session_id, order_index);

-- Enable RLS
alter table public.sessions enable row level security;
alter table public.session_exercises enable row level security;

-- RLS Policies for sessions (access through client ownership)
create policy "Users can view sessions of their clients"
  on public.sessions for select
  using (exists (
    select 1 from public.clients
    where clients.id = sessions.client_id
    and clients.user_id = auth.uid()
  ));

create policy "Users can insert sessions for their clients"
  on public.sessions for insert
  with check (exists (
    select 1 from public.clients
    where clients.id = sessions.client_id
    and clients.user_id = auth.uid()
  ));

create policy "Users can update sessions of their clients"
  on public.sessions for update
  using (exists (
    select 1 from public.clients
    where clients.id = sessions.client_id
    and clients.user_id = auth.uid()
  ));

create policy "Users can delete sessions of their clients"
  on public.sessions for delete
  using (exists (
    select 1 from public.clients
    where clients.id = sessions.client_id
    and clients.user_id = auth.uid()
  ));

-- RLS Policies for session_exercises (access through session -> client ownership)
create policy "Users can view exercises of their sessions"
  on public.session_exercises for select
  using (exists (
    select 1 from public.sessions s
    join public.clients c on c.id = s.client_id
    where s.id = session_exercises.session_id
    and c.user_id = auth.uid()
  ));

create policy "Users can insert exercises in their sessions"
  on public.session_exercises for insert
  with check (exists (
    select 1 from public.sessions s
    join public.clients c on c.id = s.client_id
    where s.id = session_exercises.session_id
    and c.user_id = auth.uid()
  ));

create policy "Users can update exercises of their sessions"
  on public.session_exercises for update
  using (exists (
    select 1 from public.sessions s
    join public.clients c on c.id = s.client_id
    where s.id = session_exercises.session_id
    and c.user_id = auth.uid()
  ));

create policy "Users can delete exercises of their sessions"
  on public.session_exercises for delete
  using (exists (
    select 1 from public.sessions s
    join public.clients c on c.id = s.client_id
    where s.id = session_exercises.session_id
    and c.user_id = auth.uid()
  ));

-- Trigger for updated_at on sessions
create trigger update_sessions_updated_at
  before update on public.sessions
  for each row
  execute function public.update_updated_at_column();
