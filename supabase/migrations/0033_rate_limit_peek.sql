-- ===========================================================================
-- Paova — read a rate-limit counter without incrementing it.
--
-- The public group page (/g/[token]) must refuse a caller that is already
-- enumerating tokens BEFORE spending a database lookup on the next guess.
-- rate_limit_hit() always increments, so it cannot answer "is this caller
-- already over the line?" without distorting the count.
--
-- Kept separate from rate_limit_hit so the write path stays a single
-- statement and the read path has no side effect.
-- ===========================================================================

create or replace function public.rate_limit_peek(
  p_bucket text,
  p_identifier text,
  p_window_seconds integer
)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_window timestamptz;
  v_hits integer;
begin
  if p_window_seconds is null or p_window_seconds <= 0 then
    return 0;
  end if;

  -- Must match the window computation in rate_limit_hit().
  v_window := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  select hits into v_hits
  from public.rate_limit
  where bucket = p_bucket
    and identifier = coalesce(p_identifier, 'unknown')
    and window_start = v_window;

  return coalesce(v_hits, 0);
end;
$$;

comment on function public.rate_limit_peek(text, text, integer) is
  'Current hit count for a bucket in the active window, without recording a hit.';

revoke all on function public.rate_limit_peek(text, text, integer) from public;
