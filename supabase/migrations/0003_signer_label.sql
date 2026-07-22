-- ===========================================================================
-- Paova — custom signer name label
-- Lets a waiver relabel the always-collected signer name field
-- (e.g. "Nom du parent / responsable" for a child activity).
-- ===========================================================================

alter table public.waiver_template
  add column if not exists signer_name_label text;
