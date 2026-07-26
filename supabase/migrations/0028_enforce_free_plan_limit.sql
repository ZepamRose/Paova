-- ===========================================================================
-- Paova — enforce the free-plan monthly signature limit atomically.
--
-- The app checked `count(*)` and then inserted in a separate statement, so two
-- concurrent signatures could both read 9/10 and both succeed (11 stored).
-- No application-level check can fix this: the guarantee has to live where the
-- write happens.
--
-- A BEFORE INSERT trigger takes a per-business transaction-scoped advisory
-- lock, so concurrent inserts for the SAME business serialize briefly while
-- different businesses stay fully parallel. The app keeps its pre-check for a
-- fast, friendly redirect; this is the backstop that actually holds.
--
-- KEEP IN SYNC: FREE_MONTHLY_LIMIT in src/lib/plan.ts
-- ===========================================================================

create or replace function public.free_monthly_signature_limit()
returns integer
language sql
immutable
as $$
  select 10;
$$;

comment on function public.free_monthly_signature_limit() is
  'Free plan monthly signature cap. Must match FREE_MONTHLY_LIMIT in src/lib/plan.ts.';

create or replace function public.enforce_free_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_plan text;
  v_used integer;
  v_limit integer := public.free_monthly_signature_limit();
begin
  select b.owner_id into v_owner_id
  from public.business b
  where b.id = new.business_id;

  -- Unknown business: let referential integrity reject it, not this trigger.
  if v_owner_id is null then
    return new;
  end if;

  select p.plan into v_plan
  from public.profiles p
  where p.id = v_owner_id;

  -- Pro is unlimited — skip the lock entirely so paying tenants never serialize.
  if v_plan = 'pro' then
    return new;
  end if;

  -- Serialize concurrent signatures for this business only.
  perform pg_advisory_xact_lock(hashtext(new.business_id::text));

  select count(*) into v_used
  from public.submission s
  where s.business_id = new.business_id
    and s.signed_at >= (date_trunc('month', now() at time zone 'utc') at time zone 'utc');

  if v_used >= v_limit then
    raise exception 'FREE_PLAN_LIMIT_REACHED'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

comment on function public.enforce_free_plan_limit() is
  'Blocks inserts past the free monthly cap. Advisory-locked per business to remove the count-then-insert race.';

drop trigger if exists submission_enforce_free_plan_limit on public.submission;
create trigger submission_enforce_free_plan_limit
  before insert on public.submission
  for each row execute function public.enforce_free_plan_limit();
