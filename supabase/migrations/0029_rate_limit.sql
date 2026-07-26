-- ===========================================================================
-- Paova — rate limiting for unauthenticated public writes.
--
-- The public signing endpoint and the public event tracker accepted unlimited
-- anonymous writes. Anyone holding a QR link could burn a business's free
-- monthly quota in seconds or flood its audit journal.
--
-- Counters live in Postgres rather than an in-memory map: on serverless each
-- instance has its own memory, so an in-process counter enforces nothing. This
-- also avoids adding an external dependency (Redis/Upstash) at this stage.
-- ===========================================================================

create table if not exists public.rate_limit (
  bucket text not null,
  identifier text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket, identifier, window_start)
);

comment on table public.rate_limit is
  'Fixed-window counters for public endpoints. Written only through rate_limit_hit().';

create index if not exists rate_limit_window_idx
  on public.rate_limit (window_start);

-- No policies: clients must never read or write this table directly. Only the
-- SECURITY DEFINER function below (and the service role) can touch it.
alter table public.rate_limit enable row level security;

create or replace function public.rate_limit_hit(
  p_bucket text,
  p_identifier text,
  p_window_seconds integer,
  p_max_hits integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window timestamptz;
  v_hits integer;
begin
  if p_window_seconds is null or p_window_seconds <= 0 then
    return true;
  end if;

  -- Fixed window: floor(now / window) keeps the key stable for its duration.
  v_window := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limit (bucket, identifier, window_start, hits)
  values (p_bucket, coalesce(p_identifier, 'unknown'), v_window, 1)
  on conflict (bucket, identifier, window_start)
    do update set hits = public.rate_limit.hits + 1
  returning hits into v_hits;

  -- Opportunistic housekeeping so the table cannot grow without bound.
  if random() < 0.01 then
    delete from public.rate_limit where window_start < now() - interval '1 day';
  end if;

  return v_hits <= p_max_hits;
end;
$$;

comment on function public.rate_limit_hit(text, text, integer, integer) is
  'Records one hit and returns false once the fixed window exceeds p_max_hits.';

revoke all on function public.rate_limit_hit(text, text, integer, integer) from public;
