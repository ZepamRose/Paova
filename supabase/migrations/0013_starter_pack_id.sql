-- Soft reference to the UX starter pack used at creation time.
-- Not a separate engine / product type — analytics + framing only.

alter table public.waiver_template
  add column if not exists starter_pack_id text;

comment on column public.waiver_template.starter_pack_id is
  'Optional id of the built-in UX pack used when the template was created (e.g. parental, sport). Null if created from scratch.';
