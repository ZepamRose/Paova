-- ===========================================================================
-- Paova — stop losing Stripe events when a webhook run dies mid-flight.
--
-- 0036 claimed event.id BEFORE processing and deleted the row on a handled
-- failure. That covers clean errors, but not a hard interruption: a function
-- timeout, an OOM, or a redeploy leaves the claim behind with the work never
-- done. Stripe retries, claimStripeWebhookEvent answers "duplicate", the route
-- acks 200 — and the event is lost for good. A dropped
-- customer.subscription.deleted keeps a cancelled tenant on Pro; a dropped
-- checkout.session.completed leaves a paying customer capped at 10 signatures.
--
-- Fix: the claim is no longer proof of completion. `processed_at` marks it,
-- and a claim older than the stale window is reclaimable so a retry can finish
-- the job.
-- ===========================================================================

alter table public.stripe_webhook_event
  add column if not exists processed_at timestamptz;

comment on column public.stripe_webhook_event.processed_at is
  'Set once the handler completed. NULL = claimed but unfinished (crash) and reclaimable after the stale window.';

-- Existing rows predate the column: they were only ever written on success.
update public.stripe_webhook_event
set processed_at = received_at
where processed_at is null;

create index if not exists stripe_webhook_event_unprocessed_idx
  on public.stripe_webhook_event (received_at)
  where processed_at is null;

-- ---------------------------------------------------------------------------
-- Atomic claim.
--
-- Returns true when the caller owns the event and must process it:
--   - no row yet                          → insert, claim
--   - row claimed but stale and unfinished → take it over
--   - row already processed / fresh claim  → false (duplicate, ack 200)
--
-- The INSERT ... ON CONFLICT DO UPDATE makes this a single statement, so two
-- concurrent deliveries of the same event cannot both win.
-- ---------------------------------------------------------------------------
create or replace function public.claim_stripe_webhook_event(
  p_event_id text,
  p_event_type text,
  p_stale_after_seconds integer default 300
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claimed boolean;
begin
  insert into public.stripe_webhook_event (id, event_type, received_at)
  values (p_event_id, p_event_type, now())
  on conflict (id) do update
    set received_at = now(),
        event_type = excluded.event_type
    where public.stripe_webhook_event.processed_at is null
      and public.stripe_webhook_event.received_at
          < now() - make_interval(secs => greatest(p_stale_after_seconds, 0))
  returning true into v_claimed;

  return coalesce(v_claimed, false);
end;
$$;

comment on function public.claim_stripe_webhook_event(text, text, integer) is
  'At-most-once claim with stale-claim recovery. True means the caller must process the event.';

revoke all on function public.claim_stripe_webhook_event(text, text, integer)
  from public, authenticated, anon;
grant execute on function public.claim_stripe_webhook_event(text, text, integer)
  to service_role;

-- ---------------------------------------------------------------------------
-- Completion marker — only a processed event is permanently deduplicated.
-- ---------------------------------------------------------------------------
create or replace function public.complete_stripe_webhook_event(p_event_id text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.stripe_webhook_event
  set processed_at = now()
  where id = p_event_id;
$$;

comment on function public.complete_stripe_webhook_event(text) is
  'Marks an event finished so later deliveries are treated as duplicates.';

revoke all on function public.complete_stripe_webhook_event(text)
  from public, authenticated, anon;
grant execute on function public.complete_stripe_webhook_event(text)
  to service_role;
