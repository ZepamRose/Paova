-- ===========================================================================
-- Paova — the team directory returns last activity, and hides emails in SQL.
--
-- Two changes, both driven by the Accès & rôles redesign:
--
--   1. `last_sign_in_at` replaces the Statut / Ajouté le columns. "Actif" said
--      almost nothing; "Il y a 3 jours" tells a manager whether the account is
--      really in use.
--
--   2. Collaborators can now open the page, so the directory has to serve them
--      — but they must never receive email addresses. Filtering in React would
--      still ship the addresses to the browser, so the projection happens here:
--      the email column comes back NULL for anyone who is not the owner.
--      Admins lose the address too, which is the stated rule.
--
-- Viewer scope widens from owner/admin to any active member of the business;
-- what widens with it is names and activity, never contact details.
-- ===========================================================================

drop function if exists public.business_member_directory(uuid);

create or replace function public.business_member_directory(p_business_id uuid)
returns table (
  user_id uuid,
  email text,
  full_name text,
  last_sign_in_at timestamptz
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
    u.last_sign_in_at
  from public.business_member target
  inner join public.profiles p on p.id = target.user_id
  inner join auth.users u on u.id = p.id
  where target.business_id = p_business_id
    and target.user_id is not null
    and exists (
      select 1
      from public.business_member viewer
      where viewer.business_id = p_business_id
        and viewer.user_id = auth.uid()
        and viewer.status = 'active'
    );
$$;

comment on function public.business_member_directory(uuid) is
  'Team directory for one business: display name and last sign-in for any active member; email address only when the caller is the owner.';

revoke all on function public.business_member_directory(uuid) from public, anon;
grant execute on function public.business_member_directory(uuid) to authenticated;
