-- ===========================================================================
-- Paova — denormalized submission search index (FTS-ready)
-- ===========================================================================

create extension if not exists pg_trgm;

create table if not exists public.submission_search (
  submission_id uuid primary key
    references public.submission(id) on delete cascade,
  business_id uuid not null
    references public.business(id) on delete cascade,
  template_id uuid not null
    references public.waiver_template(id) on delete cascade,
  signer_name text not null,
  signer_email text,
  phone text,
  proof_reference text,
  content_sha256 text,
  template_title text not null,
  business_name text,
  template_version integer,
  status text not null default 'signed',
  answers_text text,
  signed_at timestamptz not null,
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(signer_name, '')), 'A')
    || setweight(to_tsvector('simple', coalesce(signer_email, '')), 'A')
    || setweight(to_tsvector('simple', coalesce(proof_reference, '')), 'A')
    || setweight(to_tsvector('simple', coalesce(phone, '')), 'B')
    || setweight(
         to_tsvector('simple', coalesce(replace(content_sha256, ' ', ''), '')),
         'B'
       )
    || setweight(to_tsvector('simple', coalesce(template_title, '')), 'C')
    || setweight(to_tsvector('simple', coalesce(business_name, '')), 'C')
    || setweight(to_tsvector('simple', coalesce(answers_text, '')), 'D')
  ) stored
);

comment on table public.submission_search is
  'Denormalized search / export index for signed waivers (thousands+ scale).';

create index if not exists submission_search_business_signed_idx
  on public.submission_search (business_id, signed_at desc);

create index if not exists submission_search_template_signed_idx
  on public.submission_search (template_id, signed_at desc);

create index if not exists submission_search_vector_idx
  on public.submission_search using gin (search_vector);

create unique index if not exists submission_search_reference_uidx
  on public.submission_search (proof_reference)
  where proof_reference is not null;

create index if not exists submission_search_name_trgm_idx
  on public.submission_search using gin (signer_name gin_trgm_ops);

create index if not exists submission_search_email_trgm_idx
  on public.submission_search using gin (signer_email gin_trgm_ops);

alter table public.submission_search enable row level security;

drop policy if exists "submission_search_select_own" on public.submission_search;
create policy "submission_search_select_own" on public.submission_search
  for select
  using (
    business_id in (
      select id from public.business where owner_id = auth.uid()
    )
  );

-- Inserts/updates via service role (public sign) or owner (optional backfill tools).
drop policy if exists "submission_search_insert_own" on public.submission_search;
create policy "submission_search_insert_own" on public.submission_search
  for insert
  with check (
    business_id in (
      select id from public.business where owner_id = auth.uid()
    )
  );

drop policy if exists "submission_search_update_own" on public.submission_search;
create policy "submission_search_update_own" on public.submission_search
  for update
  using (
    business_id in (
      select id from public.business where owner_id = auth.uid()
    )
  )
  with check (
    business_id in (
      select id from public.business where owner_id = auth.uid()
    )
  );

-- Backfill from existing submissions (+ proof / template / business when present).
insert into public.submission_search (
  submission_id,
  business_id,
  template_id,
  signer_name,
  signer_email,
  phone,
  proof_reference,
  content_sha256,
  template_title,
  business_name,
  template_version,
  status,
  answers_text,
  signed_at
)
select
  s.id,
  s.business_id,
  s.template_id,
  s.signer_name,
  s.signer_email,
  null,
  sp.reference,
  sp.content_sha256,
  coalesce(t.title, 'Décharge'),
  b.name,
  sp.template_version,
  'signed',
  nullif(
    trim(both from regexp_replace(
      coalesce(s.answers::text, ''),
      '[{}\[\]"]',
      ' ',
      'g'
    )),
    ''
  ),
  s.signed_at
from public.submission s
join public.waiver_template t on t.id = s.template_id
join public.business b on b.id = s.business_id
left join public.signature_proof sp on sp.submission_id = s.id
on conflict (submission_id) do nothing;

-- Owner-scoped search (RLS still applies via security invoker).
create or replace function public.search_submissions_for_owner(
  p_query text default null,
  p_template_id uuid default null,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_status text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns setof public.submission_search
language sql
stable
security invoker
set search_path = public
as $$
  select s.*
  from public.submission_search s
  where s.business_id in (
      select id from public.business where owner_id = auth.uid()
    )
    and (p_template_id is null or s.template_id = p_template_id)
    and (p_from is null or s.signed_at >= p_from)
    and (p_to is null or s.signed_at <= p_to)
    and (p_status is null or s.status = p_status)
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

revoke all on function public.search_submissions_for_owner(
  text, uuid, timestamptz, timestamptz, text, integer, integer
) from public;

grant execute on function public.search_submissions_for_owner(
  text, uuid, timestamptz, timestamptz, text, integer, integer
) to authenticated;
