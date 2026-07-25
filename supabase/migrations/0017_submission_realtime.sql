-- Live dashboard refresh: broadcast new signatures to authenticated owners.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'submission'
  ) then
    alter publication supabase_realtime add table public.submission;
  end if;
end $$;
