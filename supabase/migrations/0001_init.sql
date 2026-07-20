-- ===========================================================================
-- SafeSign — initial schema
-- 4 tables: profiles, business, waiver_template, submission
-- ===========================================================================

-- 1) profiles = the user + billing state (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  stripe_customer_id text,
  plan text not null default 'trial',
  subscription_status text not null default 'trialing',
  created_at timestamptz not null default now()
);

-- 2) business = the account / venue
create table if not exists public.business (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  logo_url text,
  brand_color text not null default '#111827',
  created_at timestamptz not null default now()
);

-- 3) waiver_template = a reusable waiver definition
create table if not exists public.waiver_template (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business(id) on delete cascade,
  title text not null,
  legal_text text not null,
  fields jsonb not null default '[]'::jsonb,
  public_slug text unique not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 4) submission = a signed waiver
create table if not exists public.submission (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.waiver_template(id) on delete cascade,
  business_id uuid not null references public.business(id) on delete cascade,
  signer_name text not null,
  signer_email text,
  answers jsonb not null default '{}'::jsonb,
  signature_url text,
  pdf_url text,
  ip_address text,
  signed_at timestamptz not null default now()
);

create index if not exists waiver_template_business_id_idx on public.waiver_template (business_id);
create index if not exists submission_business_signed_idx on public.submission (business_id, signed_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.business enable row level security;
alter table public.waiver_template enable row level security;
alter table public.submission enable row level security;

-- profiles: a user can read/update only their own row
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

-- business: owner full access
create policy "business_all_own" on public.business
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- waiver_template: owner full access (via owned business)
create policy "template_all_own" on public.waiver_template
  for all
  using (business_id in (select id from public.business where owner_id = auth.uid()))
  with check (business_id in (select id from public.business where owner_id = auth.uid()));

-- submission: owner can read their business submissions.
-- Public inserts are performed server-side with the service role key, which
-- bypasses RLS — so no public insert policy is defined here on purpose.
create policy "submission_select_own" on public.submission
  for select
  using (business_id in (select id from public.business where owner_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Auto-create a profile row when a new auth user signs up
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
