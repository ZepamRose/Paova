-- ===========================================================================
-- Paova — controlled team email directory.
--
-- A team roster needs the actual email address for every active/disabled
-- member. Reading `profiles` directly only returns the caller's own row under
-- RLS; widening that policy would also expose deprecated billing columns.
-- This RPC exposes only `(user_id, email)` and only to an owner or admin of
-- the requested tenant.
-- ===========================================================================

create or replace function public.business_member_emails(p_business_id uuid)
returns table (
  user_id uuid,
  email text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id as user_id, p.email
  from public.business_member target
  inner join public.profiles p on p.id = target.user_id
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

comment on function public.business_member_emails(uuid) is
  'Returns only team member ids and emails to active owners/admins of one business.';

revoke all on function public.business_member_emails(uuid) from public, anon;
grant execute on function public.business_member_emails(uuid) to authenticated;
