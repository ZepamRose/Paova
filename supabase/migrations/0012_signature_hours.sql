-- Recurring signature opening hours (runtime gate — does not change status).
-- When enabled, the public form only accepts signatures during the window
-- in the template's timezone, on the selected weekdays (ISO 1=Mon … 7=Sun).

alter table public.waiver_template
  add column if not exists signature_hours_enabled boolean not null default false,
  add column if not exists signature_timezone text not null default 'Europe/Paris',
  add column if not exists signature_hours_start time,
  add column if not exists signature_hours_end time,
  add column if not exists signature_hours_days smallint[] not null default '{1,2,3,4,5,6,7}';

alter table public.waiver_template
  drop constraint if exists waiver_template_signature_hours_days_check;

alter table public.waiver_template
  add constraint waiver_template_signature_hours_days_check
  check (
    signature_hours_days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]
    and cardinality(signature_hours_days) >= 1
  );

comment on column public.waiver_template.signature_hours_enabled is
  'When true, public signatures are only accepted during signature_hours_* window.';
comment on column public.waiver_template.signature_timezone is
  'IANA timezone for evaluating opening hours (e.g. Europe/Paris).';
comment on column public.waiver_template.signature_hours_days is
  'ISO weekdays 1=Monday … 7=Sunday when signatures are accepted.';
