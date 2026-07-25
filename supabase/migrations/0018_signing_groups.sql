-- ===========================================================================
-- Signing groups — class / roster mode (find child → sign)
-- ===========================================================================

create table if not exists public.signing_group (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business(id) on delete cascade,
  template_id uuid not null references public.waiver_template(id) on delete cascade,
  name text not null,
  public_token text unique not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.signing_group_member (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.signing_group(id) on delete cascade,
  full_name text not null,
  dob text,
  parent_email text,
  note text,
  signed_submission_id uuid references public.submission(id) on delete set null,
  signed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists signing_group_business_id_idx
  on public.signing_group (business_id, created_at desc);
create index if not exists signing_group_template_id_idx
  on public.signing_group (template_id);
create index if not exists signing_group_public_token_idx
  on public.signing_group (public_token);
create index if not exists signing_group_member_group_id_idx
  on public.signing_group_member (group_id);
create index if not exists signing_group_member_name_idx
  on public.signing_group_member (group_id, lower(full_name));

alter table public.signing_group enable row level security;
alter table public.signing_group_member enable row level security;

create policy "signing_group_all_own" on public.signing_group
  for all
  using (business_id in (select id from public.business where owner_id = auth.uid()))
  with check (business_id in (select id from public.business where owner_id = auth.uid()));

create policy "signing_group_member_all_own" on public.signing_group_member
  for all
  using (
    group_id in (
      select sg.id
      from public.signing_group sg
      join public.business b on b.id = sg.business_id
      where b.owner_id = auth.uid()
    )
  )
  with check (
    group_id in (
      select sg.id
      from public.signing_group sg
      join public.business b on b.id = sg.business_id
      where b.owner_id = auth.uid()
    )
  );
