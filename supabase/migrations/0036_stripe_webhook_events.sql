-- ===========================================================================
-- Paova — Stripe webhook idempotency.
--
-- Stripe may deliver the same event.id more than once. Recording processed
-- ids lets the handler ack duplicates with 200 without re-running work.
-- Failures delete the row so Stripe's automatic retry can claim again.
-- Service role only (RLS on, no policies for authenticated/anon).
-- ===========================================================================

create table if not exists public.stripe_webhook_event (
  id text primary key,
  event_type text not null,
  received_at timestamptz not null default now()
);

comment on table public.stripe_webhook_event is
  'Stripe event.id values already handled. Primary key enforces at-most-once claim.';

alter table public.stripe_webhook_event enable row level security;
