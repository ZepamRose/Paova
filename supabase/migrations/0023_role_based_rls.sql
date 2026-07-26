-- ===========================================================================
-- Paova — switch every RLS policy from "owner_id = auth.uid()" to
-- business_member-based checks, with role restrictions where relevant.
--
-- Read access: any active member (owner/admin/employee).
-- Write access on governance tables (business info, waivers, groups,
-- versions, member management): owner + admin only.
-- Business info edits and deletion: owner only.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- business
-- ---------------------------------------------------------------------------
drop policy if exists "business_all_own" on public.business;

create policy "business_select_member" on public.business
  for select
  using (
    id in (
      select business_id from public.business_member
      where user_id = auth.uid() and status = 'active'
    )
  );

-- Creating a business happens before any membership row exists (onboarding).
create policy "business_insert_self" on public.business
  for insert
  with check (owner_id = auth.uid());

create policy "business_update_owner" on public.business
  for update
  using (
    id in (
      select business_id from public.business_member
      where user_id = auth.uid() and status = 'active' and role = 'owner'
    )
  );

create policy "business_delete_owner" on public.business
  for delete
  using (
    id in (
      select business_id from public.business_member
      where user_id = auth.uid() and status = 'active' and role = 'owner'
    )
  );

-- ---------------------------------------------------------------------------
-- waiver_template
-- ---------------------------------------------------------------------------
drop policy if exists "template_all_own" on public.waiver_template;

create policy "waiver_template_select_member" on public.waiver_template
  for select
  using (
    business_id in (
      select business_id from public.business_member
      where user_id = auth.uid() and status = 'active'
    )
  );

create policy "waiver_template_insert_owner_admin" on public.waiver_template
  for insert
  with check (
    business_id in (
      select business_id from public.business_member
      where user_id = auth.uid() and status = 'active' and role in ('owner', 'admin')
    )
  );

create policy "waiver_template_update_owner_admin" on public.waiver_template
  for update
  using (
    business_id in (
      select business_id from public.business_member
      where user_id = auth.uid() and status = 'active' and role in ('owner', 'admin')
    )
  );

create policy "waiver_template_delete_owner_admin" on public.waiver_template
  for delete
  using (
    business_id in (
      select business_id from public.business_member
      where user_id = auth.uid() and status = 'active' and role in ('owner', 'admin')
    )
  );

-- ---------------------------------------------------------------------------
-- waiver_template_version (read/write scoped to template governance)
-- ---------------------------------------------------------------------------
drop policy if exists "template_version_select_own" on public.waiver_template_version;
create policy "template_version_select_owner_admin" on public.waiver_template_version
  for select
  using (
    template_id in (
      select t.id
      from public.waiver_template t
      join public.business_member bm on bm.business_id = t.business_id
      where bm.user_id = auth.uid() and bm.status = 'active' and bm.role in ('owner', 'admin')
    )
  );

drop policy if exists "template_version_insert_own" on public.waiver_template_version;
create policy "template_version_insert_owner_admin" on public.waiver_template_version
  for insert
  with check (
    template_id in (
      select t.id
      from public.waiver_template t
      join public.business_member bm on bm.business_id = t.business_id
      where bm.user_id = auth.uid() and bm.status = 'active' and bm.role in ('owner', 'admin')
    )
  );

-- ---------------------------------------------------------------------------
-- submission (read-only from the client; inserts go through the service role)
-- ---------------------------------------------------------------------------
drop policy if exists "submission_select_own" on public.submission;
create policy "submission_select_member" on public.submission
  for select
  using (
    business_id in (
      select business_id from public.business_member
      where user_id = auth.uid() and status = 'active'
    )
  );

-- ---------------------------------------------------------------------------
-- signature_proof
-- ---------------------------------------------------------------------------
drop policy if exists "signature_proof_select_own" on public.signature_proof;
create policy "signature_proof_select_member" on public.signature_proof
  for select
  using (
    submission_id in (
      select s.id
      from public.submission s
      join public.business_member bm on bm.business_id = s.business_id
      where bm.user_id = auth.uid() and bm.status = 'active'
    )
  );

-- ---------------------------------------------------------------------------
-- audit_event — read is owner/admin oversight; insert stays open to any
-- active member so session-client actions keep recording events regardless
-- of role.
-- ---------------------------------------------------------------------------
drop policy if exists "audit_event_select_own" on public.audit_event;
create policy "audit_event_select_owner_admin" on public.audit_event
  for select
  using (
    business_id in (
      select business_id from public.business_member
      where user_id = auth.uid() and status = 'active' and role in ('owner', 'admin')
    )
  );

drop policy if exists "audit_event_insert_own" on public.audit_event;
create policy "audit_event_insert_member" on public.audit_event
  for insert
  with check (
    business_id in (
      select business_id from public.business_member
      where user_id = auth.uid() and status = 'active'
    )
  );

-- Widen actor_kind to cover the new roles (find the real constraint name —
-- Postgres auto-names it, don't assume it matches the source formatting).
do $$
declare
  cname text;
begin
  select conname into cname
  from pg_constraint
  where conrelid = 'public.audit_event'::regclass
    and pg_get_constraintdef(oid) ilike '%actor_kind%';
  if cname is not null then
    execute format('alter table public.audit_event drop constraint %I', cname);
  end if;
end $$;

alter table public.audit_event
  add constraint audit_event_actor_kind_check
  check (actor_kind in ('owner', 'admin', 'employee', 'signer', 'system'));

-- ---------------------------------------------------------------------------
-- submission_search
-- ---------------------------------------------------------------------------
drop policy if exists "submission_search_select_own" on public.submission_search;
create policy "submission_search_select_member" on public.submission_search
  for select
  using (
    business_id in (
      select business_id from public.business_member
      where user_id = auth.uid() and status = 'active'
    )
  );

drop policy if exists "submission_search_insert_own" on public.submission_search;
create policy "submission_search_insert_owner_admin" on public.submission_search
  for insert
  with check (
    business_id in (
      select business_id from public.business_member
      where user_id = auth.uid() and status = 'active' and role in ('owner', 'admin')
    )
  );

drop policy if exists "submission_search_update_own" on public.submission_search;
create policy "submission_search_update_owner_admin" on public.submission_search
  for update
  using (
    business_id in (
      select business_id from public.business_member
      where user_id = auth.uid() and status = 'active' and role in ('owner', 'admin')
    )
  )
  with check (
    business_id in (
      select business_id from public.business_member
      where user_id = auth.uid() and status = 'active' and role in ('owner', 'admin')
    )
  );

-- Search RPC: keep the name (call sites unchanged), update the scoping.
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
      select business_id from public.business_member
      where user_id = auth.uid() and status = 'active'
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

-- ---------------------------------------------------------------------------
-- signing_group
-- ---------------------------------------------------------------------------
drop policy if exists "signing_group_all_own" on public.signing_group;

create policy "signing_group_select_member" on public.signing_group
  for select
  using (
    business_id in (
      select business_id from public.business_member
      where user_id = auth.uid() and status = 'active'
    )
  );

create policy "signing_group_insert_owner_admin" on public.signing_group
  for insert
  with check (
    business_id in (
      select business_id from public.business_member
      where user_id = auth.uid() and status = 'active' and role in ('owner', 'admin')
    )
  );

create policy "signing_group_update_owner_admin" on public.signing_group
  for update
  using (
    business_id in (
      select business_id from public.business_member
      where user_id = auth.uid() and status = 'active' and role in ('owner', 'admin')
    )
  );

create policy "signing_group_delete_owner_admin" on public.signing_group
  for delete
  using (
    business_id in (
      select business_id from public.business_member
      where user_id = auth.uid() and status = 'active' and role in ('owner', 'admin')
    )
  );

-- ---------------------------------------------------------------------------
-- signing_group_member
-- ---------------------------------------------------------------------------
drop policy if exists "signing_group_member_all_own" on public.signing_group_member;

create policy "signing_group_member_select_member" on public.signing_group_member
  for select
  using (
    group_id in (
      select sg.id
      from public.signing_group sg
      join public.business_member bm on bm.business_id = sg.business_id
      where bm.user_id = auth.uid() and bm.status = 'active'
    )
  );

create policy "signing_group_member_insert_owner_admin" on public.signing_group_member
  for insert
  with check (
    group_id in (
      select sg.id
      from public.signing_group sg
      join public.business_member bm on bm.business_id = sg.business_id
      where bm.user_id = auth.uid() and bm.status = 'active' and bm.role in ('owner', 'admin')
    )
  );

create policy "signing_group_member_update_owner_admin" on public.signing_group_member
  for update
  using (
    group_id in (
      select sg.id
      from public.signing_group sg
      join public.business_member bm on bm.business_id = sg.business_id
      where bm.user_id = auth.uid() and bm.status = 'active' and bm.role in ('owner', 'admin')
    )
  );

create policy "signing_group_member_delete_owner_admin" on public.signing_group_member
  for delete
  using (
    group_id in (
      select sg.id
      from public.signing_group sg
      join public.business_member bm on bm.business_id = sg.business_id
      where bm.user_id = auth.uid() and bm.status = 'active' and bm.role in ('owner', 'admin')
    )
  );
