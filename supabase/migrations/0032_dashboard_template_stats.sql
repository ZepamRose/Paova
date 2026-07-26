-- ===========================================================================
-- Paova — replace the dashboard's unbounded row pull with a SQL aggregate.
--
-- The dashboard fetched up to 3000 submission rows on every load just to
-- derive per-template counts and last-signed timestamps in JavaScript (the
-- TODO(scale) noted in src/app/dashboard/page.tsx). That is O(signatures)
-- payload and CPU for O(templates) of actual information, and it silently
-- truncates past 3000 — quietly wrong for a busy venue.
--
-- security invoker: RLS still applies, so a caller only ever aggregates the
-- businesses they belong to.
-- ===========================================================================

create index if not exists submission_business_template_idx
  on public.submission (business_id, template_id);

create or replace function public.dashboard_template_stats(
  p_business_id uuid
)
returns table (
  template_id uuid,
  signature_count bigint,
  last_signed_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    s.template_id,
    count(*)::bigint as signature_count,
    max(s.signed_at) as last_signed_at
  from public.submission s
  where s.business_id = p_business_id
  group by s.template_id;
$$;

comment on function public.dashboard_template_stats(uuid) is
  'Per-template signature count and last signature for one business.';

revoke all on function public.dashboard_template_stats(uuid) from public;
grant execute on function public.dashboard_template_stats(uuid) to authenticated;
