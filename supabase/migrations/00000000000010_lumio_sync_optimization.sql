-- Migration: Lumio Sync Optimization
-- Adds content_hash for incremental sync and delta tracking fields
-- Removes branch field (always 'main')

-- Add content_hash to lumio_cards for detecting changes
ALTER TABLE lumio_cards
ADD COLUMN content_hash text;

-- Create index for hash lookups
CREATE INDEX lumio_cards_content_hash_idx ON lumio_cards (content_hash);

-- Add delta tracking fields to lumio_repositories
ALTER TABLE lumio_repositories
ADD COLUMN last_sync_added integer NOT NULL DEFAULT 0,
ADD COLUMN last_sync_updated integer NOT NULL DEFAULT 0,
ADD COLUMN last_sync_removed integer NOT NULL DEFAULT 0,
ADD COLUMN last_sync_unchanged integer NOT NULL DEFAULT 0;

-- Remove branch column (always 'main' now, hardcoded in Edge Function)
ALTER TABLE lumio_repositories
DROP COLUMN branch;

-- Backfill content_hash for existing cards using MD5 (will be replaced with SHA-256 on next sync)
UPDATE lumio_cards
SET content_hash = md5(raw_content)
WHERE content_hash IS NULL;
