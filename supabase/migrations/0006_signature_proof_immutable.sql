-- ===========================================================================
-- Paova — harden signature_proof immutability
-- Rows are insert-once evidence dossiers. Updates are forbidden even for
-- the service role (trigger). Deletes remain allowed via CASCADE from
-- submission (GDPR erasure / owner data lifecycle).
-- ===========================================================================

create or replace function public.signature_proof_reject_update()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'signature_proof is immutable: updates are not allowed (id=%)',
    old.id
    using errcode = 'integrity_constraint_violation';
end;
$$;

drop trigger if exists signature_proof_immutable_update on public.signature_proof;

create trigger signature_proof_immutable_update
  before update on public.signature_proof
  for each row
  execute function public.signature_proof_reject_update();

comment on function public.signature_proof_reject_update() is
  'Rejects any UPDATE on signature_proof to keep the evidence dossier immutable.';
