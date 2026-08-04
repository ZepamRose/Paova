-- Business opening hours
-- Stores the weekly schedule used by the 'business_close' session closing mode.
-- Schema: { mon, tue, wed, thu, fri, sat, sun }
-- Each day is either null (closed) or { open: "HH:MM", close: "HH:MM" }.

ALTER TABLE public.business
  ADD COLUMN IF NOT EXISTS opening_hours jsonb;

COMMENT ON COLUMN public.business.opening_hours IS
  'Weekly opening hours. Keys: mon,tue,wed,thu,fri,sat,sun.
   Each value is {"open":"HH:MM","close":"HH:MM"} or null if closed that day.
   Used by the business_close session closing mode.';
