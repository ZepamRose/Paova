-- ===========================================================================
-- Paova — template lifecycle status + expiration
-- ===========================================================================

-- 1) Explicit status (replaces relying on is_active alone)
alter table public.waiver_template
  add column if not exists status text;

update public.waiver_template
set status = case when is_active then 'open' else 'inactive' end
where status is null;

alter table public.waiver_template
  alter column status set default 'open';

alter table public.waiver_template
  alter column status set not null;

-- Drop previous check if re-run, then enforce allowed values.
alter table public.waiver_template
  drop constraint if exists waiver_template_status_check;

alter table public.waiver_template
  add constraint waiver_template_status_check
  check (status in ('open', 'inactive', 'expired', 'archived'));

comment on column public.waiver_template.status is
  'Lifecycle: open | inactive | expired | archived. is_active is kept in sync for compatibility.';

-- 2) Expiration settings
alter table public.waiver_template
  add column if not exists expiration_mode text not null default 'none';

alter table public.waiver_template
  drop constraint if exists waiver_template_expiration_mode_check;

alter table public.waiver_template
  add constraint waiver_template_expiration_mode_check
  check (expiration_mode in ('none', 'relative_days', 'absolute_date'));

alter table public.waiver_template
  add column if not exists expiration_days integer;

alter table public.waiver_template
  add column if not exists expires_at timestamptz;

alter table public.waiver_template
  drop constraint if exists waiver_template_expiration_days_check;

alter table public.waiver_template
  add constraint waiver_template_expiration_days_check
  check (
    expiration_days is null
    or (expiration_days >= 1 and expiration_days <= 3650)
  );

comment on column public.waiver_template.expiration_mode is
  'none | relative_days | absolute_date';
comment on column public.waiver_template.expiration_days is
  'Used when expiration_mode = relative_days.';
comment on column public.waiver_template.expires_at is
  'Effective expiration timestamp. Null when mode = none.';

-- Keep is_active aligned with status for legacy readers.
create or replace function public.waiver_template_sync_is_active()
returns trigger
language plpgsql
as $$
begin
  new.is_active := (new.status = 'open');
  return new;
end;
$$;

drop trigger if exists waiver_template_sync_is_active on public.waiver_template;

create trigger waiver_template_sync_is_active
  before insert or update of status on public.waiver_template
  for each row
  execute function public.waiver_template_sync_is_active();

-- One-time sync for existing rows
update public.waiver_template
set is_active = (status = 'open')
where is_active is distinct from (status = 'open');

create index if not exists waiver_template_status_idx
  on public.waiver_template (business_id, status);

create index if not exists waiver_template_expires_at_idx
  on public.waiver_template (expires_at)
  where expires_at is not null and status = 'open';
