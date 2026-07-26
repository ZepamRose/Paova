-- ===========================================================================
-- Paova — let an invited user claim their own pending membership on first
-- login, without granting them any broader business_member access.
-- ===========================================================================

-- A pending invite (user_id null) can be claimed by the authenticated user
-- whose JWT email matches invited_email — but only to attach their own
-- user_id and flip status to active. Role and business_id cannot change
-- through this policy, so a claim can never self-escalate privileges.
create policy "business_member_claim_own_invite" on public.business_member
  for update
  using (
    status = 'invited'
    and user_id is null
    and invited_email is not null
    and lower(invited_email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  )
  with check (
    user_id = auth.uid()
    and status = 'active'
    and role = (
      select bm.role from public.business_member bm where bm.id = business_member.id
    )
    and business_id = (
      select bm.business_id from public.business_member bm where bm.id = business_member.id
    )
  );
