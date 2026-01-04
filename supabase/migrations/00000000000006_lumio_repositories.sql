-- Lumio Repositories - Milestone 8
-- Repository GitHub contenenti carte Lumio sincronizzate localmente

-- ============================================
-- LUMIO REPOSITORIES
-- ============================================

create table public.lumio_repositories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  github_owner text not null,
  github_repo text not null,
  branch text not null default 'main',
  access_token text, -- encrypted, for private repos
  last_commit_hash text,
  last_sync_at timestamp with time zone,
  sync_status text not null default 'pending' check (sync_status in ('pending', 'syncing', 'synced', 'error')),
  sync_error text,
  cards_count integer not null default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Unique constraint: same user can't add same repo twice
create unique index lumio_repositories_user_repo_idx
  on public.lumio_repositories(user_id, github_owner, github_repo);

-- Index for sync status queries
create index lumio_repositories_sync_status_idx on public.lumio_repositories(sync_status);
create index lumio_repositories_last_sync_at_idx on public.lumio_repositories(last_sync_at);

alter table public.lumio_repositories enable row level security;

create policy "Users can view their own repositories"
  on public.lumio_repositories for select using (auth.uid() = user_id);
create policy "Users can insert their own repositories"
  on public.lumio_repositories for insert with check (auth.uid() = user_id);
create policy "Users can update their own repositories"
  on public.lumio_repositories for update using (auth.uid() = user_id);
create policy "Users can delete their own repositories"
  on public.lumio_repositories for delete using (auth.uid() = user_id);

-- Trigger for updated_at
create trigger update_lumio_repositories_updated_at
  before update on public.lumio_repositories for each row execute function public.update_updated_at_column();
