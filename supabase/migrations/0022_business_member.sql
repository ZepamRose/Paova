-- ===========================================================================
-- Paova — multi-user organizations (business_member)
-- Foundation for Owner / Admin / Employee roles. One business can now have
-- several authenticated users instead of a single owner_id login.
-- ===========================================================================

create table if not exists public.business_member (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business(id) on delete cascade,
  -- Null while the invite is pending (no auth.users row yet for that email).
  user_id uuid references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'employee')),
  status text not null default 'active' check (status in ('invited', 'active')),
  invited_email text,
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint business_member_identity_check
    check (user_id is not null or invited_email is not null)
);

comment on table public.business_member is
  'Membership of a user in a business, with a role. Replaces the single-owner model.';

create index if not exists business_member_business_id_idx
  on public.business_member (business_id);

create index if not exists business_member_user_id_idx
  on public.business_member (user_id)
  where user_id is not null;

-- One active row per (business, user) — a person can't be a member twice.
create unique index if not exists business_member_business_user_uidx
  on public.business_member (business_id, user_id)
  where user_id is not null;

-- One pending invite per (business, email) — case-insensitive.
create unique index if not exists business_member_business_invited_email_uidx
  on public.business_member (business_id, lower(invited_email))
  where status = 'invited';

-- Exactly one owner per business (transfer = update the existing row, not insert a second one).
create unique index if not exists business_member_one_owner_uidx
  on public.business_member (business_id)
  where role = 'owner';

-- ---------------------------------------------------------------------------
-- Auto-create the owner membership when a business is created.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_business()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.business_member (business_id, user_id, role, status)
  values (new.id, new.owner_id, 'owner', 'active')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_business_created on public.business;
create trigger on_business_created
  after insert on public.business
  for each row execute function public.handle_new_business();

-- Backfill: give every existing business its owner membership row.
insert into public.business_member (business_id, user_id, role, status)
select id, owner_id, 'owner', 'active'
from public.business
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.business_member enable row level security;

-- Anyone can see their own membership row (including a pending invite once
-- linked, and to know their own role/status).
create policy "business_member_select_self" on public.business_member
  for select
  using (user_id = auth.uid());

-- Active members can see the full roster of businesses they belong to.
create policy "business_member_select_team" on public.business_member
  for select
  using (
    business_id in (
      select business_id from public.business_member
      where user_id = auth.uid() and status = 'active'
    )
  );

-- Owner/Admin can invite new members.
create policy "business_member_insert_owner_admin" on public.business_member
  for insert
  with check (
    business_id in (
      select business_id from public.business_member
      where user_id = auth.uid() and status = 'active' and role in ('owner', 'admin')
    )
  );

-- Owner/Admin can update memberships (change role, link a pending invite).
create policy "business_member_update_owner_admin" on public.business_member
  for update
  using (
    business_id in (
      select business_id from public.business_member
      where user_id = auth.uid() and status = 'active' and role in ('owner', 'admin')
    )
  );

-- Owner/Admin can remove a member.
create policy "business_member_delete_owner_admin" on public.business_member
  for delete
  using (
    business_id in (
      select business_id from public.business_member
      where user_id = auth.uid() and status = 'active' and role in ('owner', 'admin')
    )
  );
