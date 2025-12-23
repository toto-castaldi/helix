-- Live Coaching - Migration
-- Adds fields to track exercise completion during live sessions

-- ============================================
-- SESSION EXERCISES - Add completion tracking
-- ============================================

alter table public.session_exercises
  add column completed boolean not null default false,
  add column completed_at timestamp with time zone;

create index session_exercises_completed_idx on public.session_exercises(completed);

-- ============================================
-- SESSIONS - Add current exercise index
-- ============================================

alter table public.sessions
  add column current_exercise_index integer not null default 0;
