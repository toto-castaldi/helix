-- Exercise Lumio Card FK - Milestone 8
-- Aggiunge riferimento a carta Lumio locale per gli esercizi

-- ============================================
-- ADD LUMIO_CARD_ID TO EXERCISES
-- ============================================

-- Add column for linking exercise to local Lumio card
-- When set, this takes precedence over card_url
alter table public.exercises
  add column lumio_card_id uuid references public.lumio_cards(id) on delete set null;

-- Index for lookups
create index exercises_lumio_card_id_idx on public.exercises(lumio_card_id);

-- Add comment for documentation
comment on column public.exercises.lumio_card_id is
  'Reference to local Lumio card. When set, takes precedence over card_url.';
