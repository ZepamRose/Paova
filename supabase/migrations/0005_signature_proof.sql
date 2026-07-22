-- ===========================================================================
-- Paova — signature proof of evidence + template versioning
-- ===========================================================================

-- 1) Version the waiver template so each signature can freeze what was accepted
alter table public.waiver_template
  add column if not exists version integer not null default 1;

comment on column public.waiver_template.version is
  'Incremented when title, legal_text, fields or signer_name_label change.';

-- 2) Immutable proof dossier linked 1:1 to a submission
create table if not exists public.signature_proof (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique
    references public.submission(id) on delete cascade,

  reference text not null,

  signed_at timestamptz not null,
  timezone text,
  timezone_offset_minutes integer,

  ip_address text,
  user_agent text,
  device_hint text,

  template_id uuid not null
    references public.waiver_template(id) on delete restrict,
  template_version integer not null,
  content_snapshot jsonb not null,

  content_sha256 text not null,
  hash_algorithm text not null default 'SHA-256',

  -- Future extensions: email OTP, SMS, external timestamping, etc.
  evidence jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists signature_proof_template_id_idx
  on public.signature_proof (template_id);

create index if not exists signature_proof_signed_at_idx
  on public.signature_proof (signed_at desc);

comment on table public.signature_proof is
  'Digital evidence dossier for a signed waiver (not eIDAS-qualified).';

alter table public.signature_proof enable row level security;

-- Owner can read proofs for submissions belonging to their business.
-- Inserts are performed server-side with the service role (bypass RLS).
create policy "signature_proof_select_own" on public.signature_proof
  for select
  using (
    submission_id in (
      select s.id
      from public.submission s
      join public.business b on b.id = s.business_id
      where b.owner_id = auth.uid()
    )
  );
