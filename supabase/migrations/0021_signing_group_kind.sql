-- ===========================================================================
-- Signing groups — roster (liste) vs express (walk-in sans liste)
-- ===========================================================================

alter table public.signing_group
  add column if not exists kind text not null default 'roster';

alter table public.signing_group
  drop constraint if exists signing_group_kind_check;

alter table public.signing_group
  add constraint signing_group_kind_check
  check (kind in ('roster', 'express'));

comment on column public.signing_group.kind is
  'roster = find-name flow with prepared list; express = walk-in, name entered at signature time.';
