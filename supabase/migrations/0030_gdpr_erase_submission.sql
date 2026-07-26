-- ===========================================================================
-- Paova — GDPR art. 17 (right to erasure).
--
-- There was no way to delete a signer's data: `submission` had no DELETE
-- policy at all. Paova is the processor and each business is the controller,
-- so without this the customer physically cannot honour an erasure request —
-- on a product sold as "RGPD-friendly".
--
-- Deleting the submission row cascades to everything holding personal data:
--   signature_proof      submission_id ... on delete cascade  (snapshot, IP, UA)
--   submission_search    submission_id ... on delete cascade  (denormalised PII)
--   signing_group_member signed_submission_id ... on delete set null
--   audit_event          submission_id ... on delete set null (trail survives)
--
-- signature_proof rejects UPDATE by trigger but allows DELETE by design —
-- 0006 documented cascade deletion as the GDPR escape hatch.
-- ===========================================================================

create policy "submission_delete_owner_admin" on public.submission
  for delete
  using (
    business_id in (
      select public.current_user_business_ids_with_roles(array['owner', 'admin'])
    )
  );

-- submission_search rows disappear by cascade, but an explicit policy keeps
-- manual cleanup possible for owner/admin without the service role.
create policy "submission_search_delete_owner_admin" on public.submission_search
  for delete
  using (
    business_id in (
      select public.current_user_business_ids_with_roles(array['owner', 'admin'])
    )
  );
