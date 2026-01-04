-- Lumio Cards - Milestone 8
-- Carte Lumio sincronizzate dai repository

-- ============================================
-- LUMIO CARDS
-- ============================================

create table public.lumio_cards (
  id uuid primary key default gen_random_uuid(),
  repository_id uuid references public.lumio_repositories(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null, -- denormalized for RLS efficiency
  file_path text not null, -- path in the repository
  title text, -- from frontmatter
  content text not null, -- markdown with resolved image paths
  raw_content text not null, -- original markdown
  frontmatter jsonb, -- parsed frontmatter (title, tags, difficulty, language, etc.)
  source_available boolean not null default true, -- false if deleted from source repo
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Unique constraint: same file path can't exist twice in same repo
create unique index lumio_cards_repo_path_idx
  on public.lumio_cards(repository_id, file_path);

-- Index for user queries
create index lumio_cards_user_id_idx on public.lumio_cards(user_id);
create index lumio_cards_repository_id_idx on public.lumio_cards(repository_id);

-- GIN index for frontmatter (tags search)
create index lumio_cards_frontmatter_idx on public.lumio_cards using gin(frontmatter);

-- Full-text search index on title and content
create index lumio_cards_title_idx on public.lumio_cards(title);
create index lumio_cards_search_idx on public.lumio_cards using gin(
  to_tsvector('italian', coalesce(title, '') || ' ' || coalesce(content, ''))
);

alter table public.lumio_cards enable row level security;

create policy "Users can view their own cards"
  on public.lumio_cards for select using (auth.uid() = user_id);
create policy "Users can insert their own cards"
  on public.lumio_cards for insert with check (auth.uid() = user_id);
create policy "Users can update their own cards"
  on public.lumio_cards for update using (auth.uid() = user_id);
create policy "Users can delete their own cards"
  on public.lumio_cards for delete using (auth.uid() = user_id);

-- Trigger for updated_at
create trigger update_lumio_cards_updated_at
  before update on public.lumio_cards for each row execute function public.update_updated_at_column();
