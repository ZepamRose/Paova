-- ===========================================================================
-- Paova — let invitees SELECT their own pending invite row.
-- Without this, some PostgREST UPDATE … RETURNING paths can fail to claim
-- because the row is invisible under SELECT policies before user_id is set.
-- ===========================================================================

drop policy if exists "business_member_select_own_invite" on public.business_member;
create policy "business_member_select_own_invite" on public.business_member
  for select
  using (
    status = 'invited'
    and user_id is null
    and invited_email is not null
    and lower(invited_email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  );
