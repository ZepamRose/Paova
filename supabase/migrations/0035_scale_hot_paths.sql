-- ===========================================================================
-- Paova — scale hot paths: private signature storage, aggregate RPCs,
-- group-aware search, and indexes that keep dashboards O(templates/groups)
-- instead of O(signatures).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- A) Private Storage bucket `signatures`
-- Path convention: `{business_id}/{submission_id}.png`
-- Uploads go through the service role (submitWaiver). Authenticated
-- owner/admin may SELECT their own tenant folder for future signed URLs.
-- No public access.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('signatures', 'signatures', false)
on conflict (id) do update set public = false;

drop policy if exists "signatures_select_own_business" on storage.objects;
create policy "signatures_select_own_business" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'signatures'
    and (storage.foldername(name))[1] in (
      select bid::text
      from public.current_user_business_ids_with_roles(array['owner', 'admin']) as bid
    )
  );

-- ---------------------------------------------------------------------------
-- B) Hot-path index for waiver detail / search by template
-- ---------------------------------------------------------------------------
create index if not exists submission_template_signed_idx
  on public.submission (template_id, signed_at desc);

-- ---------------------------------------------------------------------------
-- C) Per-group member totals (dashboard + groupes list)
-- ---------------------------------------------------------------------------
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
  select
    sgm.group_id,
    count(*)::bigint as total,
    count(sgm.signed_submission_id)::bigint as signed
  from public.signing_group_member sgm
  inner join public.signing_group sg on sg.id = sgm.group_id
  where sg.business_id = p_business_id
  group by sgm.group_id;
$$;

comment on function public.dashboard_group_stats(uuid) is
  'Per-group roster size and signed count for one business.';

revoke all on function public.dashboard_group_stats(uuid) from public;
grant execute on function public.dashboard_group_stats(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- D) Proof version counts (waiver detail Versions tab)
-- ---------------------------------------------------------------------------
create or replace function public.template_proof_version_counts(
  p_template_id uuid
)
returns table (
  template_version int,
  signature_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    sp.template_version,
    count(*)::bigint as signature_count
  from public.signature_proof sp
  where sp.template_id = p_template_id
  group by sp.template_version;
$$;

comment on function public.template_proof_version_counts(uuid) is
  'Signature counts per template_version for one waiver template.';

revoke all on function public.template_proof_version_counts(uuid) from public;
grant execute on function public.template_proof_version_counts(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Sparkline: daily signature counts (UTC calendar day of signed_at)
-- ---------------------------------------------------------------------------
create or replace function public.dashboard_signature_days(
  p_business_id uuid,
  p_from timestamptz
)
returns table (
  day date,
  cnt bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  -- Day buckets use UTC (signed_at::date). Good enough for the dashboard sparkline.
  select
    (s.signed_at::date) as day,
    count(*)::bigint as cnt
  from public.submission s
  where s.business_id = p_business_id
    and s.signed_at >= p_from
  group by (s.signed_at::date)
  order by day;
$$;

comment on function public.dashboard_signature_days(uuid, timestamptz) is
  'Daily signature counts for one business from p_from onward. Days are UTC.';

revoke all on function public.dashboard_signature_days(uuid, timestamptz) from public;
grant execute on function public.dashboard_signature_days(uuid, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- E) search_submissions_for_owner — optional group filters
-- p_group_mode: null | 'any' | 'none' | 'one' (requires p_group_id)
-- ---------------------------------------------------------------------------
drop function if exists public.search_submissions_for_owner(
  text, uuid, timestamptz, timestamptz, text, integer, integer
);

create or replace function public.search_submissions_for_owner(
  p_query text default null,
  p_template_id uuid default null,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_status text default null,
  p_limit integer default 50,
  p_offset integer default 0,
  p_group_id uuid default null,
  p_group_mode text default null
)
returns setof public.submission_search
language sql
stable
security invoker
set search_path = public
as $$
  select s.*
  from public.submission_search s
  where s.business_id in (select public.current_user_business_ids())
    and (p_template_id is null or s.template_id = p_template_id)
    and (p_from is null or s.signed_at >= p_from)
    and (p_to is null or s.signed_at <= p_to)
    and (p_status is null or s.status = p_status)
    and (
      p_group_mode is null
      or (
        p_group_mode = 'one'
        and p_group_id is not null
        and exists (
          select 1
          from public.signing_group_member sgm
          where sgm.signed_submission_id = s.submission_id
            and sgm.group_id = p_group_id
        )
      )
      or (
        p_group_mode = 'any'
        and exists (
          select 1
          from public.signing_group_member sgm
          inner join public.signing_group sg on sg.id = sgm.group_id
          where sgm.signed_submission_id = s.submission_id
            and sg.business_id in (select public.current_user_business_ids())
        )
      )
      or (
        p_group_mode = 'none'
        and not exists (
          select 1
          from public.signing_group_member sgm
          inner join public.signing_group sg on sg.id = sgm.group_id
          where sgm.signed_submission_id = s.submission_id
            and sg.business_id in (select public.current_user_business_ids())
        )
      )
    )
    and (
      p_query is null
      or btrim(p_query) = ''
      or s.search_vector @@ websearch_to_tsquery('simple', btrim(p_query))
      or s.signer_name ilike '%' || btrim(p_query) || '%'
      or coalesce(s.signer_email, '') ilike '%' || btrim(p_query) || '%'
      or coalesce(s.phone, '') ilike '%' || btrim(p_query) || '%'
      or coalesce(s.proof_reference, '') ilike '%' || btrim(p_query) || '%'
      or coalesce(s.content_sha256, '') ilike '%' || btrim(p_query) || '%'
      or s.template_title ilike '%' || btrim(p_query) || '%'
      or coalesce(s.business_name, '') ilike '%' || btrim(p_query) || '%'
      or coalesce(s.answers_text, '') ilike '%' || btrim(p_query) || '%'
    )
  order by s.signed_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 200))
  offset greatest(0, coalesce(p_offset, 0));
$$;

comment on function public.search_submissions_for_owner(
  text, uuid, timestamptz, timestamptz, text, integer, integer, uuid, text
) is
  'Owner/member submission search with optional group filters (any/none/one).';

revoke all on function public.search_submissions_for_owner(
  text, uuid, timestamptz, timestamptz, text, integer, integer, uuid, text
) from public;

grant execute on function public.search_submissions_for_owner(
  text, uuid, timestamptz, timestamptz, text, integer, integer, uuid, text
) to authenticated;
