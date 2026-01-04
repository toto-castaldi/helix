-- Lumio Card Images - Milestone 8
-- Immagini delle carte Lumio salvate in Supabase Storage

-- ============================================
-- LUMIO CARD IMAGES
-- ============================================

create table public.lumio_card_images (
  id uuid primary key default gen_random_uuid(),
  card_id uuid references public.lumio_cards(id) on delete cascade not null,
  original_path text not null, -- original path in markdown (e.g., "./images/squat.png")
  storage_path text not null, -- path in Supabase Storage (e.g., "user-id/repo-id/hash.png")
  created_at timestamp with time zone default now()
);

-- Index for card lookups
create index lumio_card_images_card_id_idx on public.lumio_card_images(card_id);

-- Unique constraint: same original path can't exist twice for same card
create unique index lumio_card_images_card_path_idx
  on public.lumio_card_images(card_id, original_path);

alter table public.lumio_card_images enable row level security;

-- RLS policies via join with lumio_cards
create policy "Users can view images of their cards"
  on public.lumio_card_images for select
  using (exists (
    select 1 from public.lumio_cards
    where lumio_cards.id = lumio_card_images.card_id
    and lumio_cards.user_id = auth.uid()
  ));

create policy "Users can insert images for their cards"
  on public.lumio_card_images for insert
  with check (exists (
    select 1 from public.lumio_cards
    where lumio_cards.id = lumio_card_images.card_id
    and lumio_cards.user_id = auth.uid()
  ));

create policy "Users can update images of their cards"
  on public.lumio_card_images for update
  using (exists (
    select 1 from public.lumio_cards
    where lumio_cards.id = lumio_card_images.card_id
    and lumio_cards.user_id = auth.uid()
  ));

create policy "Users can delete images of their cards"
  on public.lumio_card_images for delete
  using (exists (
    select 1 from public.lumio_cards
    where lumio_cards.id = lumio_card_images.card_id
    and lumio_cards.user_id = auth.uid()
  ));

-- ============================================
-- STORAGE BUCKET for Lumio Images
-- ============================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lumio-images',
  'lumio-images',
  true,
  10485760, -- 10MB
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
on conflict (id) do nothing;

-- Storage policies for lumio-images bucket
drop policy if exists "Public read access for lumio images" on storage.objects;
drop policy if exists "Authenticated users can upload lumio images" on storage.objects;
drop policy if exists "Users can update own lumio images" on storage.objects;
drop policy if exists "Users can delete own lumio images" on storage.objects;

create policy "Public read access for lumio images"
  on storage.objects for select using (bucket_id = 'lumio-images');

create policy "Authenticated users can upload lumio images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'lumio-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update own lumio images"
  on storage.objects for update to authenticated
  using (bucket_id = 'lumio-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete own lumio images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'lumio-images' and (storage.foldername(name))[1] = auth.uid()::text);
