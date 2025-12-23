-- Make client age/birth_date optional
-- Remove the constraint that requires either birth_date or age_years
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS birth_date_or_age_required;
