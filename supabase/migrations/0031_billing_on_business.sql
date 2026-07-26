-- ===========================================================================
-- Paova — move billing state from `profiles` (per user) to `business`
-- (per tenant), and close a billing-bypass hole.
--
-- Two problems solved here.
--
-- 1) STRUCTURAL. Since business_member landed, a business can have several
--    users, but plan/subscription lived on the *caller's* profile. An admin
--    therefore saw "Plan Gratuit" and a quota bar on a Pro business, and any
--    future per-seat logic had no tenant to hang off. Billing belongs to the
--    business, not to whoever happens to be logged in.
--
-- 2) SECURITY. `profiles_update_own` (0001) grants UPDATE on the whole
--    profiles row with no column restriction, so a free user could run
--    update profiles set plan='pro' where id = auth.uid()
--    straight from the browser with the anon key and unlock unlimited
--    signatures. RLS is row-level, not column-level — the fix is a
--    column-level REVOKE, applied here to both tables.
-- ===========================================================================

alter table public.business
  add column if not exists plan text not null default 'free',
  add column if not exists subscription_status text not null default 'inactive',
  add column if not exists stripe_customer_id text;

comment on column public.business.plan is
  'free | pro — authoritative subscription tier for the whole tenant.';

create unique index if not exists business_stripe_customer_id_uidx
  on public.business (stripe_customer_id)
  where stripe_customer_id is not null;

-- Backfill from the owner's profile so no paying customer is downgraded.
update public.business b
set plan = coalesce(p.plan, 'free'),
    subscription_status = coalesce(p.subscription_status, 'inactive'),
    stripe_customer_id = p.stripe_customer_id
from public.profiles p
where p.id = b.owner_id;

-- ---------------------------------------------------------------------------
-- Column-level protection: only the service role (Stripe webhook) may write
-- billing state. Owners keep UPDATE on every other business column via the
-- existing `business_update_owner` policy.
-- ---------------------------------------------------------------------------
revoke update (plan, subscription_status, stripe_customer_id)
  on public.business from authenticated;

revoke update (plan, subscription_status, stripe_customer_id)
  on public.profiles from authenticated;

-- ---------------------------------------------------------------------------
-- Repoint the free-plan guard (0028) at the new source of truth. It read the
-- owner's profile, which is now deprecated; reading `business` also removes a
-- join and works for tenants whose owner row was never provisioned.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_free_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
  v_used integer;
  v_limit integer := public.free_monthly_signature_limit();
begin
  select b.plan into v_plan
  from public.business b
  where b.id = new.business_id;

  -- Unknown business: let referential integrity reject it, not this trigger.
  if v_plan is null then
    return new;
  end if;

  -- Pro is unlimited — skip the lock so paying tenants never serialize.
  if v_plan = 'pro' then
    return new;
  end if;

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

-- Legacy columns stay in place for one release as a read-only safety net for
-- reconciliation, but are no longer written or read by the application.
comment on column public.profiles.plan is
  'DEPRECATED — superseded by business.plan. Read-only; drop after one release.';
comment on column public.profiles.subscription_status is
  'DEPRECATED — superseded by business.subscription_status.';
comment on column public.profiles.stripe_customer_id is
  'DEPRECATED — superseded by business.stripe_customer_id.';
