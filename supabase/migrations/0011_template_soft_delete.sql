-- ===========================================================================
-- Paova — soft-delete / archive for waiver templates
-- Templates are archived instead of hard-deleted so submissions & proofs remain.
-- ===========================================================================

alter table public.waiver_template
  add column if not exists deleted_at timestamptz;

comment on column public.waiver_template.deleted_at is
  'When set, the template is archived (hidden from the main dashboard). Rows are retained.';

create index if not exists waiver_template_not_deleted_idx
  on public.waiver_template (business_id, created_at desc)
  where deleted_at is null;

-- Existing archived rows without deleted_at get stamped (best-effort).
update public.waiver_template
set deleted_at = coalesce(deleted_at, now())
where status = 'archived'
  and deleted_at is null;
