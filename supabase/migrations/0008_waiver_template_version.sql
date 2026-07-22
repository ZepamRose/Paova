-- ===========================================================================
-- Paova — immutable template version history
-- ===========================================================================

create table if not exists public.waiver_template_version (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null
    references public.waiver_template(id) on delete cascade,
  version integer not null,
  title text not null,
  legal_text text not null,
  fields jsonb not null default '[]'::jsonb,
  signer_name_label text,
  created_by uuid
    references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (template_id, version)
);

comment on table public.waiver_template_version is
  'Immutable snapshot of a waiver template at a given version number.';

create index if not exists waiver_template_version_template_idx
  on public.waiver_template_version (template_id, version desc);

alter table public.waiver_template_version enable row level security;

drop policy if exists "template_version_select_own" on public.waiver_template_version;
create policy "template_version_select_own" on public.waiver_template_version
  for select
  using (
    template_id in (
      select t.id
      from public.waiver_template t
      join public.business b on b.id = t.business_id
      where b.owner_id = auth.uid()
    )
  );

drop policy if exists "template_version_insert_own" on public.waiver_template_version;
create policy "template_version_insert_own" on public.waiver_template_version
  for insert
  with check (
    template_id in (
      select t.id
      from public.waiver_template t
      join public.business b on b.id = t.business_id
      where b.owner_id = auth.uid()
    )
  );

-- Immutability: no updates.
create or replace function public.waiver_template_version_reject_update()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'waiver_template_version is immutable: updates are not allowed (id=%)',
    old.id
    using errcode = 'integrity_constraint_violation';
end;
$$;

drop trigger if exists waiver_template_version_immutable_update
  on public.waiver_template_version;

create trigger waiver_template_version_immutable_update
  before update on public.waiver_template_version
  for each row
  execute function public.waiver_template_version_reject_update();

-- Link proofs to the exact version row (nullable for legacy rows).
alter table public.signature_proof
  add column if not exists template_version_id uuid
    references public.waiver_template_version(id) on delete set null;

create index if not exists signature_proof_template_version_id_idx
  on public.signature_proof (template_version_id)
  where template_version_id is not null;

-- Backfill: freeze current template content as its current version number.
insert into public.waiver_template_version (
  template_id,
  version,
  title,
  legal_text,
  fields,
  signer_name_label,
  created_at
)
select
  t.id,
  t.version,
  t.title,
  t.legal_text,
  t.fields,
  t.signer_name_label,
  t.created_at
from public.waiver_template t
on conflict (template_id, version) do nothing;

-- Attach existing proofs to matching version rows.
-- Temporarily disable immutability: this is a one-time schema backfill only.
alter table public.signature_proof disable trigger signature_proof_immutable_update;

update public.signature_proof sp
set template_version_id = v.id
from public.waiver_template_version v
where sp.template_version_id is null
  and v.template_id = sp.template_id
  and v.version = sp.template_version;

alter table public.signature_proof enable trigger signature_proof_immutable_update;
