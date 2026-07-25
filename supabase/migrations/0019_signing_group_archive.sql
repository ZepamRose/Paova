-- ===========================================================================
-- Signing groups — archive support
-- A closed group used to stay forever on the dashboard with no way to hide
-- it. Groups can now be archived (soft, reversible) like waiver templates.
-- ===========================================================================

alter table public.signing_group
  drop constraint if exists signing_group_status_check;

alter table public.signing_group
  add constraint signing_group_status_check
  check (status in ('open', 'closed', 'archived'));

alter table public.signing_group
  add column if not exists archived_at timestamptz;

create index if not exists signing_group_business_status_idx
  on public.signing_group (business_id, status, created_at desc);
