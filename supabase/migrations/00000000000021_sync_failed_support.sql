-- Sync Failed Support - Milestone v1.7
-- Add sync_failed status and error tracking columns to lumio_repositories

-- ============================================
-- UPDATE SYNC STATUS CONSTRAINT
-- ============================================

-- Drop existing inline check constraint (auto-named by PostgreSQL)
ALTER TABLE public.lumio_repositories
  DROP CONSTRAINT lumio_repositories_sync_status_check;

-- Recreate with sync_failed added
ALTER TABLE public.lumio_repositories
  ADD CONSTRAINT lumio_repositories_sync_status_check
  CHECK (sync_status IN ('pending', 'syncing', 'synced', 'error', 'sync_failed'));

-- ============================================
-- ADD ERROR TRACKING COLUMNS
-- ============================================

ALTER TABLE public.lumio_repositories
  ADD COLUMN sync_error_message text;

ALTER TABLE public.lumio_repositories
  ADD COLUMN sync_failed_at timestamp with time zone;

-- ============================================
-- DOCUMENTATION
-- ============================================

COMMENT ON COLUMN public.lumio_repositories.sync_error_message
  IS 'Error message from Docora sync_failed webhook. Cleared on successful file sync.';

COMMENT ON COLUMN public.lumio_repositories.sync_failed_at
  IS 'Timestamp of last sync failure from Docora. Cleared on successful file sync.';
