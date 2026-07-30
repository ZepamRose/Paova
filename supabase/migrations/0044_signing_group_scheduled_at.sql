-- ===========================================================================
-- Paova — planned sessions get a date.
--
-- A "session planifiée" is prepared before a group turns up, so the moment it
-- is expected is the fact the card is built around. Until now the only date on
-- the row was created_at, which says when someone opened the form — not when
-- the class, the team or the party actually arrives.
--
-- Nullable on purpose: sessions created before this migration have no date,
-- and an express session opened on the spot never needs one. The UI treats a
-- null as "no date set" rather than inventing one.
-- ===========================================================================

alter table public.signing_group
  add column if not exists scheduled_at timestamptz;

comment on column public.signing_group.scheduled_at is
  'When the group is expected. Null when the session is unscheduled (express, or created before this column existed).';

-- Dashboards list upcoming sessions first, per business.
create index if not exists signing_group_business_scheduled_idx
  on public.signing_group (business_id, scheduled_at desc nulls last);
