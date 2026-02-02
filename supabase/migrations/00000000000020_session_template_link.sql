-- Add template_id to session_exercises for linked template behavior
-- Exercises from a template reference the template, enabling:
-- 1. Blocking edit in session view (coach edits template instead)
-- 2. Block template deletion if any session uses it

ALTER TABLE public.session_exercises
ADD COLUMN template_id uuid REFERENCES public.group_templates(id) ON DELETE RESTRICT;

-- Partial index for finding sessions using a template (only non-null values)
CREATE INDEX session_exercises_template_id_idx
  ON public.session_exercises(template_id)
  WHERE template_id IS NOT NULL;

-- Note: No RLS changes needed - session_exercises already has RLS
-- template_id is nullable - non-template exercises remain as-is
