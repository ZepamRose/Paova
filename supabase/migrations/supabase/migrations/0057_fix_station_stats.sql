-- Fix dashboard_group_stats to correctly count signatures for stations
-- 
-- Problem: 
-- - Stations (signature libres) store signatures in submission.represented_group_id
-- - Sessions (planned) use signing_group_member table
-- - Old function only counted signing_group_member, causing stations to show "0/0" or incorrect counts
--
-- Solution:
-- - Check group kind
-- - For stations: count submissions
-- - For sessions: count members (existing logic)

create or replace function public.dashboard_group_stats(
  p_business_id uuid
)
returns table (
  group_id uuid,
  total bigint,
  signed bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  -- For sessions (planned groups with member lists)
  select
    sgm.group_id,
    count(*)::bigint as total,
    count(sgm.signed_submission_id)::bigint as signed
  from public.signing_group_member sgm
  inner join public.signing_group sg on sg.id = sgm.group_id
  where sg.business_id = p_business_id
    and (sg.kind is null or sg.kind != 'station')
  group by sgm.group_id

  union all

  -- For stations (continuous signature collection)
  select
    sg.id as group_id,
    count(s.id)::bigint as total,
    count(s.id)::bigint as signed  -- All submissions are signed for stations
  from public.signing_group sg
  left join public.submission s on s.represented_group_id = sg.id
  where sg.business_id = p_business_id
    and sg.kind = 'station'
  group by sg.id;
$$;

comment on function public.dashboard_group_stats(uuid) is
  'Per-group signature counts. For sessions: counts members. For stations: counts submissions.';

revoke all on function public.dashboard_group_stats(uuid) from public;
grant execute on function public.dashboard_group_stats(uuid) to authenticated;