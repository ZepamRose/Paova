-- ===========================================================================
-- Paova — logos storage bucket
-- Public bucket to host each establishment's logo (shown on signing pages/PDF).
-- ===========================================================================

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

-- Anyone can read logos (they appear on public signing pages and PDFs).
create policy "logos_select_public" on storage.objects
  for select
  using (bucket_id = 'logos');

-- Authenticated owners can upload / replace / delete logos.
create policy "logos_insert_authenticated" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'logos');

create policy "logos_update_authenticated" on storage.objects
  for update to authenticated
  using (bucket_id = 'logos');

create policy "logos_delete_authenticated" on storage.objects
  for delete to authenticated
  using (bucket_id = 'logos');
