-- Migration: Global search RPC for command palette
-- Provides fast search across signatures for Cmd+K palette

create or replace function search_signatures(
  p_query text,
  p_limit int default 10
)
returns table (
  id uuid,
  signer_name text,
  signer_email text,
  template_title text,
  signed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
begin
  -- Get current user's business
  select business_id into v_business_id
  from business_member
  where user_id = auth.uid()
    and status = 'active'
  limit 1;

  if v_business_id is null then
    return;
  end if;

  -- Search signatures by name, email, or ID
  return query
  select
    s.id,
    s.signer_name,
    s.signer_email,
    t.title as template_title,
    s.signed_at
  from submission s
  inner join template t on t.id = s.template_id
  where t.business_id = v_business_id
    and t.deleted_at is null
    and (
      s.signer_name ilike '%' || p_query || '%'
      or s.signer_email ilike '%' || p_query || '%'
      or s.public_id ilike '%' || p_query || '%'
    )
  order by s.signed_at desc
  limit p_limit;
end;
$$;

comment on function search_signatures(text, int) is
  'Fast global search across signatures for command palette (Cmd+K). Returns recent matches by name, email, or ID.';
