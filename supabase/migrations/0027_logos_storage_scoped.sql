-- ===========================================================================
-- Paova — close the cross-tenant hole on the `logos` storage bucket.
--
-- 0002 granted INSERT/UPDATE/DELETE on `logos` to *any* authenticated user
-- with no ownership check, so anyone with an account could overwrite or
-- delete another business's logo — a logo that renders on public signing
-- pages and inside signed PDFs.
--
-- Uploads already use the path `{business_id}/logo-<ts>.<ext>`, so the first
-- path segment is the tenant key. Writes are now scoped to the owner of that
-- business, matching `business_update_owner` and the `edit_business_info`
-- capability (branding is owner-only).
--
-- Reads stay public on purpose: logos are displayed on anonymous signing
-- pages and embedded in PDFs.
-- ===========================================================================

drop policy if exists "logos_insert_authenticated" on storage.objects;
drop policy if exists "logos_update_authenticated" on storage.objects;
drop policy if exists "logos_delete_authenticated" on storage.objects;

-- Helper: does the object path belong to a business the caller owns?
create or replace function public.storage_path_is_owned_business(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.current_user_business_ids_with_roles(array['owner']) as bid
    where bid::text = (storage.foldername(object_name))[1]
  );
$$;

comment on function public.storage_path_is_owned_business(text) is
  'True when the first path segment is a business_id the caller owns. Used to scope the logos bucket.';

revoke all on function public.storage_path_is_owned_business(text) from public;
grant execute on function public.storage_path_is_owned_business(text) to authenticated;

create policy "logos_insert_own_business" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'logos'
    and public.storage_path_is_owned_business(name)
  );

create policy "logos_update_own_business" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'logos'
    and public.storage_path_is_owned_business(name)
  )
  with check (
    bucket_id = 'logos'
    and public.storage_path_is_owned_business(name)
  );

create policy "logos_delete_own_business" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'logos'
    and public.storage_path_is_owned_business(name)
  );
