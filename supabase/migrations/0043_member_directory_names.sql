-- ===========================================================================
-- Paova - controlled team directory with optional account display names.
--
-- Auth metadata is the only source of a member name today. It remains private
-- except for this narrowly scoped directory: active owners and administrators
-- can read the name and email of members in their own business only.
-- ===========================================================================

create or replace function public.business_member_directory(p_business_id uuid)
returns table (
  user_id uuid,
  email text,
  full_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id as user_id,
    p.email,
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
    ) as full_name
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
        and viewer.role in ('owner', 'admin')
    );
$$;

comment on function public.business_member_directory(uuid) is
  'Returns only team member ids, emails, and optional auth display names to active owners/admins of one business.';

revoke all on function public.business_member_directory(uuid) from public, anon;
grant execute on function public.business_member_directory(uuid) to authenticated;
