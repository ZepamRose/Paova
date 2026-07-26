-- ===========================================================================
-- Paova — close exploitable holes from the 2026-07 pentest:
--
-- 1. business_member RLS let any admin UPDATE/DELETE/INSERT any role,
--    including promoting themselves to owner (UI was not the boundary).
-- 2. rate_limit_hit / rate_limit_peek had REVOKE FROM public but no GRANT to
--    service_role, so the public sign path's limiter failed open forever.
-- 3. Owners could set logo_url / thank_you_button_url to arbitrary strings
--    via PostgREST (SSRF + javascript: XSS on /merci), bypassing app sanitizers.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Role hierarchy — enforced in a BEFORE trigger (runs even when RLS allows)
-- ---------------------------------------------------------------------------
create or replace function public.business_member_enforce_hierarchy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_role text;
  v_business_id uuid;
begin
  -- Service role / postgres: auth.uid() is null and RLS is bypassed.
  -- Keep system paths (webhooks, migrations, service tooling) working.
  if auth.uid() is null then
    return coalesce(NEW, OLD);
  end if;

  v_business_id := coalesce(NEW.business_id, OLD.business_id);

  -- Invite claim: invitee may only attach user_id + flip status (see guard_claim).
  if TG_OP = 'UPDATE'
     and OLD.user_id is null
     and OLD.status = 'invited'
     and NEW.user_id = auth.uid()
     and NEW.status = 'active'
     and NEW.role is not distinct from OLD.role
     and NEW.business_id is not distinct from OLD.business_id then
    return NEW;
  end if;

  -- Bootstrap owner row when creating a business (handle_new_business).
  -- Runs before the membership lookup: the creator is not a member yet.
  if TG_OP = 'INSERT'
     and NEW.role = 'owner'
     and NEW.user_id = auth.uid()
     and exists (
       select 1 from public.business b
       where b.id = NEW.business_id and b.owner_id = auth.uid()
     )
     and not exists (
       select 1 from public.business_member bm
       where bm.business_id = NEW.business_id and bm.role = 'owner'
     ) then
    return NEW;
  end if;

  select bm.role
    into v_actor_role
  from public.business_member bm
  where bm.user_id = auth.uid()
    and bm.business_id = v_business_id
    and bm.status = 'active'
  limit 1;

  if v_actor_role is null then
    raise exception 'Not an active member of this business'
      using errcode = 'insufficient_privilege';
  end if;

  if TG_OP = 'INSERT' then
    if NEW.role = 'owner' then
      raise exception 'Cannot insert an additional owner'
        using errcode = 'insufficient_privilege';
    end if;

    if v_actor_role = 'owner' then
      if NEW.role not in ('admin', 'employee') then
        raise exception 'Owner can only invite admin or employee'
          using errcode = 'insufficient_privilege';
      end if;
      return NEW;
    end if;

    if v_actor_role = 'admin' then
      if NEW.role <> 'employee' then
        raise exception 'Admin can only invite employees'
          using errcode = 'insufficient_privilege';
      end if;
      return NEW;
    end if;

    raise exception 'Insufficient privilege to insert members'
      using errcode = 'insufficient_privilege';
  end if;

  if TG_OP = 'UPDATE' then
    if v_actor_role = 'owner' then
      -- Owner may manage anyone except inventing a second owner via role bump
      -- without demoting themselves first (unique index still applies).
      if NEW.role = 'owner' and OLD.role is distinct from 'owner' then
        raise exception 'Ownership transfer must demote the current owner first'
          using errcode = 'insufficient_privilege';
      end if;
      if OLD.role = 'owner' and NEW.role is distinct from 'owner' then
        -- Allow demotion only when another owner row already exists (transfer).
        if not exists (
          select 1 from public.business_member bm
          where bm.business_id = v_business_id
            and bm.role = 'owner'
            and bm.id is distinct from OLD.id
        ) then
          raise exception 'Cannot demote the only owner'
            using errcode = 'insufficient_privilege';
        end if;
      end if;
      return NEW;
    end if;

    if v_actor_role = 'admin' then
      if OLD.role in ('owner', 'admin') then
        raise exception 'Admin cannot modify owners or other admins'
          using errcode = 'insufficient_privilege';
      end if;
      if NEW.role is distinct from 'employee' then
        raise exception 'Admin cannot change roles to admin or owner'
          using errcode = 'insufficient_privilege';
      end if;
      if NEW.business_id is distinct from OLD.business_id then
        raise exception 'Cannot move members across businesses'
          using errcode = 'insufficient_privilege';
      end if;
      return NEW;
    end if;

    raise exception 'Insufficient privilege to update members'
      using errcode = 'insufficient_privilege';
  end if;

  if TG_OP = 'DELETE' then
    if v_actor_role = 'owner' then
      if OLD.role = 'owner' then
        raise exception 'Cannot delete the owner membership'
          using errcode = 'insufficient_privilege';
      end if;
      return OLD;
    end if;

    if v_actor_role = 'admin' then
      if OLD.role <> 'employee' then
        raise exception 'Admin can only remove employees'
          using errcode = 'insufficient_privilege';
      end if;
      return OLD;
    end if;

    raise exception 'Insufficient privilege to delete members'
      using errcode = 'insufficient_privilege';
  end if;

  return coalesce(NEW, OLD);
end;
$$;

comment on function public.business_member_enforce_hierarchy() is
  'Enforces owner > admin > employee hierarchy. Admins cannot promote themselves or touch owners.';

drop trigger if exists business_member_enforce_hierarchy on public.business_member;
create trigger business_member_enforce_hierarchy
  before insert or update or delete on public.business_member
  for each row execute function public.business_member_enforce_hierarchy();

-- ---------------------------------------------------------------------------
-- 2. Rate-limit RPCs callable by the service role (public sign path)
-- ---------------------------------------------------------------------------
-- Ensure peek exists even if 0033 was never applied on this database.
create or replace function public.rate_limit_peek(
  p_bucket text,
  p_identifier text,
  p_window_seconds integer
)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_window timestamptz;
  v_hits integer;
begin
  if p_window_seconds is null or p_window_seconds <= 0 then
    return 0;
  end if;

  v_window := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  select hits into v_hits
  from public.rate_limit
  where bucket = p_bucket
    and identifier = coalesce(p_identifier, 'unknown')
    and window_start = v_window;

  return coalesce(v_hits, 0);
end;
$$;

comment on function public.rate_limit_peek(text, text, integer) is
  'Current hit count for a bucket in the active window, without recording a hit.';

revoke all on function public.rate_limit_peek(text, text, integer) from public;

grant execute on function public.rate_limit_hit(text, text, integer, integer)
  to service_role;
grant execute on function public.rate_limit_peek(text, text, integer)
  to service_role;

-- Authenticated dashboard never needs these; keep them off the JWT surface.
revoke execute on function public.rate_limit_hit(text, text, integer, integer)
  from authenticated, anon;
revoke execute on function public.rate_limit_peek(text, text, integer)
  from authenticated, anon;

-- ---------------------------------------------------------------------------
-- 3. URL integrity on business (closes SSRF / javascript: XSS via PostgREST)
-- ---------------------------------------------------------------------------
-- Scrub any existing poison before adding CHECKs.
update public.business
set logo_url = null
where logo_url is not null
  and logo_url !~* '^https?://[^[:space:]]+/storage/v1/object/public/logos/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/';

update public.business
set thank_you_button_url = null
where thank_you_button_url is not null
  and thank_you_button_url !~* '^https?://';

update public.business
set website_url = null
where website_url is not null
  and website_url !~* '^https?://';

alter table public.business
  drop constraint if exists business_logo_url_storage_check;
alter table public.business
  add constraint business_logo_url_storage_check
  check (
    logo_url is null
    or logo_url ~* '^https?://[^[:space:]]+/storage/v1/object/public/logos/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
  );

alter table public.business
  drop constraint if exists business_thank_you_button_url_http_check;
alter table public.business
  add constraint business_thank_you_button_url_http_check
  check (
    thank_you_button_url is null
    or thank_you_button_url ~* '^https?://'
  );

alter table public.business
  drop constraint if exists business_website_url_http_check;
alter table public.business
  add constraint business_website_url_http_check
  check (
    website_url is null
    or website_url ~* '^https?://'
  );
