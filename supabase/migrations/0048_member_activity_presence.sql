-- ===========================================================================
-- Paova — activity presence tracking (last_seen_at).
--
-- auth.users.last_sign_in_at is updated only at login, so a user who logged
-- in 3 days ago but is currently using the app still shows "Il y a 3 jours".
--
-- This migration adds:
--   1. business_member.last_seen_at (nullable timestamptz)
--   2. update_member_activity() RPC — called by a client-side heartbeat
--      every 2 minutes to mark the user as active.
--   3. Updated business_member_directory() that returns last_seen_at.
--
-- The UI will show:
--   - 🟢 En ligne (< 5 min)
--   - Vu il y a X min (5-60 min)
--   - Aujourd'hui à HH:mm
--   - Dates for older activity
-- ===========================================================================

alter table public.business_member
  add column if not exists last_seen_at timestamptz;

comment on column public.business_member.last_seen_at is
  'Last activity timestamp updated by periodic heartbeat while the user is actively using the app. NULL means no heartbeat received yet.';

create index if not exists business_member_last_seen_at_idx
  on public.business_member (last_seen_at desc)
  where last_seen_at is not null;

-- ---------------------------------------------------------------------------
-- Heartbeat RPC — updates last_seen_at for the current user's membership
-- ---------------------------------------------------------------------------
create or replace function public.update_member_activity(
  p_business_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.business_member
  set last_seen_at = now()
  where business_id = p_business_id
    and user_id = auth.uid()
    and status = 'active';
end;
$$;

comment on function public.update_member_activity(uuid) is
  'Updates last_seen_at for the caller active membership in the given business. Called by client-side heartbeat every ~2 minutes.';

revoke all on function public.update_member_activity(uuid) from public, anon;
grant execute on function public.update_member_activity(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Updated directory: return last_seen_at alongside last_sign_in_at
-- ---------------------------------------------------------------------------
drop function if exists public.business_member_directory(uuid);

create or replace function public.business_member_directory(p_business_id uuid)
returns table (
  user_id uuid,
  email text,
  full_name text,
  last_sign_in_at timestamptz,
  last_seen_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id as user_id,
    -- Owner only. Every other caller gets NULL straight from the database.
    case
      when exists (
        select 1
        from public.business_member owner_check
        where owner_check.business_id = p_business_id
          and owner_check.user_id = auth.uid()
          and owner_check.status = 'active'
          and owner_check.role = 'owner'
      ) then p.email
      else null
    end as email,
    nullif(
      trim(
        coalesce(
          u.raw_user_meta_data ->> 'full_name',
          u.raw_user_meta_data ->> 'name',
          concat_ws(
            ' ',
            nullif(u.raw_user_meta_data ->> 'first_name', ''),
            nullif(u.raw_user_meta_data ->> 'last_name', '')
          )
        )
      ),
      ''
    ) as full_name,
    u.last_sign_in_at,
    bm.last_seen_at
  from public.business_member bm
  inner join public.profiles p on p.id = bm.user_id
  inner join auth.users u on u.id = p.id
  where bm.business_id = p_business_id
    and bm.user_id is not null
    and exists (
      select 1
      from public.business_member viewer
      where viewer.business_id = p_business_id
        and viewer.user_id = auth.uid()
        and viewer.status = 'active'
    );
$$;

comment on function public.business_member_directory(uuid) is
  'Team directory: display name, last sign-in, and last activity heartbeat. Email only visible to owner.';

revoke all on function public.business_member_directory(uuid) from public, anon;
grant execute on function public.business_member_directory(uuid) to authenticated;
