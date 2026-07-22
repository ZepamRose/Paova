-- ===========================================================================
-- Paova — append-only audit event log
-- ===========================================================================

create table if not exists public.audit_event (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null
    references public.business(id) on delete cascade,
  actor_user_id uuid
    references public.profiles(id) on delete set null,
  actor_kind text not null
    check (actor_kind in ('owner', 'signer', 'system')),
  entity_type text not null
    check (entity_type in ('template', 'submission', 'proof', 'export')),
  entity_id uuid,
  template_id uuid
    references public.waiver_template(id) on delete set null,
  submission_id uuid
    references public.submission(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.audit_event is
  'Append-only journal of significant product events (templates, signatures, exports).';

create index if not exists audit_event_business_created_idx
  on public.audit_event (business_id, created_at desc);

create index if not exists audit_event_template_created_idx
  on public.audit_event (template_id, created_at desc)
  where template_id is not null;

create index if not exists audit_event_submission_idx
  on public.audit_event (submission_id)
  where submission_id is not null;

create index if not exists audit_event_type_idx
  on public.audit_event (event_type);

alter table public.audit_event enable row level security;

-- Owners can read events for their business.
create policy "audit_event_select_own" on public.audit_event
  for select
  using (
    business_id in (
      select id from public.business where owner_id = auth.uid()
    )
  );

-- Owners can insert events for their business (dashboard actions).
-- Public/signer events are inserted with the service role (bypass RLS).
create policy "audit_event_insert_own" on public.audit_event
  for insert
  with check (
    business_id in (
      select id from public.business where owner_id = auth.uid()
    )
  );

-- Immutability: no updates (even service role).
create or replace function public.audit_event_reject_update()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'audit_event is immutable: updates are not allowed (id=%)',
    old.id
    using errcode = 'integrity_constraint_violation';
end;
$$;

drop trigger if exists audit_event_immutable_update on public.audit_event;

create trigger audit_event_immutable_update
  before update on public.audit_event
  for each row
  execute function public.audit_event_reject_update();

comment on function public.audit_event_reject_update() is
  'Rejects any UPDATE on audit_event to keep the journal append-only.';

-- Soft immutability for deletes: owners should not delete rows via client.
-- No DELETE policy → authenticated clients cannot delete. Service role can
-- still delete for GDPR / business cascade (business_id ON DELETE CASCADE).
