-- ===========================================================================
-- Paova — pin search to one tenant + normalize invite emails.
--
-- 1) search_submissions_for_owner accepted every active seat via
--    current_user_business_ids(), so a multi-tenant member mixed PII across
--    businesses. p_business_id is now required and must be one of the caller's
--    active seats.
-- 2) invited_email is forced lowercase so claimPendingInvite `.in()` matches
--    the unique index on lower(invited_email).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- A) Normalize invited_email
-- ---------------------------------------------------------------------------
create or replace function public.business_member_normalize_invited_email()
returns trigger
language plpgsql
as $$
begin
  if NEW.invited_email is not null then
    NEW.invited_email := lower(btrim(NEW.invited_email));
    if NEW.invited_email = '' then
      NEW.invited_email := null;
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists business_member_normalize_invited_email on public.business_member;
create trigger business_member_normalize_invited_email
  before insert or update of invited_email on public.business_member
  for each row execute function public.business_member_normalize_invited_email();

update public.business_member
set invited_email = lower(btrim(invited_email))
where invited_email is not null
  and invited_email <> lower(btrim(invited_email));

create index if not exists business_member_invited_email_pending_idx
  on public.business_member (invited_email)
  where status = 'invited';

-- ---------------------------------------------------------------------------
-- B) Tenant-pinned search
-- ---------------------------------------------------------------------------
drop function if exists public.search_submissions_for_owner(
  text, uuid, timestamptz, timestamptz, text, integer, integer, uuid, text
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
  p_group_mode text default null,
  p_business_id uuid default null
)
returns setof public.submission_search
language sql
stable
security invoker
set search_path = public
as $$
  select s.*
  from public.submission_search s
  where p_business_id is not null
    and p_business_id in (select public.current_user_business_ids())
    and s.business_id = p_business_id
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
            and sg.business_id = p_business_id
        )
      )
      or (
        p_group_mode = 'none'
        and not exists (
          select 1
          from public.signing_group_member sgm
          inner join public.signing_group sg on sg.id = sgm.group_id
          where sgm.signed_submission_id = s.submission_id
            and sg.business_id = p_business_id
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
  text, uuid, timestamptz, timestamptz, text, integer, integer, uuid, text, uuid
) is
  'Submission search pinned to one of the caller''s active businesses (p_business_id required).';

revoke all on function public.search_submissions_for_owner(
  text, uuid, timestamptz, timestamptz, text, integer, integer, uuid, text, uuid
) from public;

grant execute on function public.search_submissions_for_owner(
  text, uuid, timestamptz, timestamptz, text, integer, integer, uuid, text, uuid
) to authenticated;
