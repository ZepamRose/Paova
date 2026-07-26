-- ===========================================================================
-- Paova — fix infinite RLS recursion introduced in 0022/0023.
--
-- Policies ON business_member that sub-queried business_member (and every
-- policy elsewhere that sub-queried it, since that read re-triggered those
-- policies) made Postgres raise:
--   "infinite recursion detected in policy for relation business_member"
-- Every authenticated SELECT therefore returned nothing, which sent the app
-- into the /onboarding -> /premiere-decharge -> /onboarding redirect loop.
--
-- Fix: read membership through SECURITY DEFINER helpers. They bypass RLS on
-- business_member, so no policy re-entry — the documented Supabase pattern
-- for membership tables.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.current_user_business_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select business_id
  from public.business_member
  where user_id = auth.uid() and status = 'active';
$$;

comment on function public.current_user_business_ids() is
  'Businesses the caller actively belongs to. SECURITY DEFINER to avoid RLS recursion.';

create or replace function public.current_user_business_ids_with_roles(p_roles text[])
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select business_id
  from public.business_member
  where user_id = auth.uid()
    and status = 'active'
    and role = any(p_roles);
$$;

comment on function public.current_user_business_ids_with_roles(text[]) is
  'Businesses where the caller holds one of the given roles. SECURITY DEFINER to avoid RLS recursion.';

revoke all on function public.current_user_business_ids() from public;
revoke all on function public.current_user_business_ids_with_roles(text[]) from public;
grant execute on function public.current_user_business_ids() to authenticated;
grant execute on function public.current_user_business_ids_with_roles(text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- business_member — the source of the recursion
-- ---------------------------------------------------------------------------
drop policy if exists "business_member_select_team" on public.business_member;
create policy "business_member_select_team" on public.business_member
  for select
  using (business_id in (select public.current_user_business_ids()));

drop policy if exists "business_member_insert_owner_admin" on public.business_member;
create policy "business_member_insert_owner_admin" on public.business_member
  for insert
  with check (
    business_id in (
      select public.current_user_business_ids_with_roles(array['owner', 'admin'])
    )
  );

drop policy if exists "business_member_update_owner_admin" on public.business_member;
create policy "business_member_update_owner_admin" on public.business_member
  for update
  using (
    business_id in (
      select public.current_user_business_ids_with_roles(array['owner', 'admin'])
    )
  );

drop policy if exists "business_member_delete_owner_admin" on public.business_member;
create policy "business_member_delete_owner_admin" on public.business_member
  for delete
  using (
    business_id in (
      select public.current_user_business_ids_with_roles(array['owner', 'admin'])
    )
  );

-- Invite claim: same intent as 0024, without the self-referencing sub-selects.
-- Role/business immutability is enforced by the trigger below instead.
drop policy if exists "business_member_claim_own_invite" on public.business_member;
create policy "business_member_claim_own_invite" on public.business_member
  for update
  using (
    status = 'invited'
    and user_id is null
    and invited_email is not null
    and lower(invited_email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  )
  with check (user_id = auth.uid() and status = 'active');

create or replace function public.business_member_guard_claim()
returns trigger
language plpgsql
as $$
begin
  -- While claiming a pending invite, only user_id/status may change.
  if old.user_id is null
     and (new.role is distinct from old.role
          or new.business_id is distinct from old.business_id) then
    raise exception
      'Claiming an invite cannot change role or business (id=%)', old.id
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

drop trigger if exists business_member_guard_claim on public.business_member;
create trigger business_member_guard_claim
  before update on public.business_member
  for each row execute function public.business_member_guard_claim();

-- ---------------------------------------------------------------------------
-- business
-- ---------------------------------------------------------------------------
drop policy if exists "business_select_member" on public.business;
create policy "business_select_member" on public.business
  for select
  using (id in (select public.current_user_business_ids()));

drop policy if exists "business_update_owner" on public.business;
create policy "business_update_owner" on public.business
  for update
  using (
    id in (select public.current_user_business_ids_with_roles(array['owner']))
  );

drop policy if exists "business_delete_owner" on public.business;
create policy "business_delete_owner" on public.business
  for delete
  using (
    id in (select public.current_user_business_ids_with_roles(array['owner']))
  );

-- ---------------------------------------------------------------------------
-- waiver_template
-- ---------------------------------------------------------------------------
drop policy if exists "waiver_template_select_member" on public.waiver_template;
create policy "waiver_template_select_member" on public.waiver_template
  for select
  using (business_id in (select public.current_user_business_ids()));

drop policy if exists "waiver_template_insert_owner_admin" on public.waiver_template;
create policy "waiver_template_insert_owner_admin" on public.waiver_template
  for insert
  with check (
    business_id in (
      select public.current_user_business_ids_with_roles(array['owner', 'admin'])
    )
  );

drop policy if exists "waiver_template_update_owner_admin" on public.waiver_template;
create policy "waiver_template_update_owner_admin" on public.waiver_template
  for update
  using (
    business_id in (
      select public.current_user_business_ids_with_roles(array['owner', 'admin'])
    )
  );

drop policy if exists "waiver_template_delete_owner_admin" on public.waiver_template;
create policy "waiver_template_delete_owner_admin" on public.waiver_template
  for delete
  using (
    business_id in (
      select public.current_user_business_ids_with_roles(array['owner', 'admin'])
    )
  );

-- ---------------------------------------------------------------------------
-- waiver_template_version
-- ---------------------------------------------------------------------------
drop policy if exists "template_version_select_owner_admin" on public.waiver_template_version;
create policy "template_version_select_owner_admin" on public.waiver_template_version
  for select
  using (
    template_id in (
      select t.id from public.waiver_template t
      where t.business_id in (
        select public.current_user_business_ids_with_roles(array['owner', 'admin'])
      )
    )
  );

drop policy if exists "template_version_insert_owner_admin" on public.waiver_template_version;
create policy "template_version_insert_owner_admin" on public.waiver_template_version
  for insert
  with check (
    template_id in (
      select t.id from public.waiver_template t
      where t.business_id in (
        select public.current_user_business_ids_with_roles(array['owner', 'admin'])
      )
    )
  );

-- ---------------------------------------------------------------------------
-- submission
-- ---------------------------------------------------------------------------
drop policy if exists "submission_select_member" on public.submission;
create policy "submission_select_member" on public.submission
  for select
  using (business_id in (select public.current_user_business_ids()));

-- ---------------------------------------------------------------------------
-- signature_proof
-- ---------------------------------------------------------------------------
drop policy if exists "signature_proof_select_member" on public.signature_proof;
create policy "signature_proof_select_member" on public.signature_proof
  for select
  using (
    submission_id in (
      select s.id from public.submission s
      where s.business_id in (select public.current_user_business_ids())
    )
  );

-- ---------------------------------------------------------------------------
-- audit_event
-- ---------------------------------------------------------------------------
drop policy if exists "audit_event_select_owner_admin" on public.audit_event;
create policy "audit_event_select_owner_admin" on public.audit_event
  for select
  using (
    business_id in (
      select public.current_user_business_ids_with_roles(array['owner', 'admin'])
    )
  );

drop policy if exists "audit_event_insert_member" on public.audit_event;
create policy "audit_event_insert_member" on public.audit_event
  for insert
  with check (business_id in (select public.current_user_business_ids()));

-- ---------------------------------------------------------------------------
-- submission_search
-- ---------------------------------------------------------------------------
drop policy if exists "submission_search_select_member" on public.submission_search;
create policy "submission_search_select_member" on public.submission_search
  for select
  using (business_id in (select public.current_user_business_ids()));

drop policy if exists "submission_search_insert_owner_admin" on public.submission_search;
create policy "submission_search_insert_owner_admin" on public.submission_search
  for insert
  with check (
    business_id in (
      select public.current_user_business_ids_with_roles(array['owner', 'admin'])
    )
  );

drop policy if exists "submission_search_update_owner_admin" on public.submission_search;
create policy "submission_search_update_owner_admin" on public.submission_search
  for update
  using (
    business_id in (
      select public.current_user_business_ids_with_roles(array['owner', 'admin'])
    )
  )
  with check (
    business_id in (
      select public.current_user_business_ids_with_roles(array['owner', 'admin'])
    )
  );

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
  where s.business_id in (select public.current_user_business_ids())
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

-- ---------------------------------------------------------------------------
-- signing_group
-- ---------------------------------------------------------------------------
drop policy if exists "signing_group_select_member" on public.signing_group;
create policy "signing_group_select_member" on public.signing_group
  for select
  using (business_id in (select public.current_user_business_ids()));

drop policy if exists "signing_group_insert_owner_admin" on public.signing_group;
create policy "signing_group_insert_owner_admin" on public.signing_group
  for insert
  with check (
    business_id in (
      select public.current_user_business_ids_with_roles(array['owner', 'admin'])
    )
  );

drop policy if exists "signing_group_update_owner_admin" on public.signing_group;
create policy "signing_group_update_owner_admin" on public.signing_group
  for update
  using (
    business_id in (
      select public.current_user_business_ids_with_roles(array['owner', 'admin'])
    )
  );

drop policy if exists "signing_group_delete_owner_admin" on public.signing_group;
create policy "signing_group_delete_owner_admin" on public.signing_group
  for delete
  using (
    business_id in (
      select public.current_user_business_ids_with_roles(array['owner', 'admin'])
    )
  );

-- ---------------------------------------------------------------------------
-- signing_group_member
-- ---------------------------------------------------------------------------
drop policy if exists "signing_group_member_select_member" on public.signing_group_member;
create policy "signing_group_member_select_member" on public.signing_group_member
  for select
  using (
    group_id in (
      select sg.id from public.signing_group sg
      where sg.business_id in (select public.current_user_business_ids())
    )
  );

drop policy if exists "signing_group_member_insert_owner_admin" on public.signing_group_member;
create policy "signing_group_member_insert_owner_admin" on public.signing_group_member
  for insert
  with check (
    group_id in (
      select sg.id from public.signing_group sg
      where sg.business_id in (
        select public.current_user_business_ids_with_roles(array['owner', 'admin'])
      )
    )
  );

drop policy if exists "signing_group_member_update_owner_admin" on public.signing_group_member;
create policy "signing_group_member_update_owner_admin" on public.signing_group_member
  for update
  using (
    group_id in (
      select sg.id from public.signing_group sg
      where sg.business_id in (
        select public.current_user_business_ids_with_roles(array['owner', 'admin'])
      )
    )
  );

drop policy if exists "signing_group_member_delete_owner_admin" on public.signing_group_member;
create policy "signing_group_member_delete_owner_admin" on public.signing_group_member
  for delete
  using (
    group_id in (
      select sg.id from public.signing_group sg
      where sg.business_id in (
        select public.current_user_business_ids_with_roles(array['owner', 'admin'])
      )
    )
  );
