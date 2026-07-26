import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { getStripe } from "@/lib/stripe/server";
import {
  billingSnapshotFromSubscriptions,
  customerHasOpenSubscription as snapshotHasOpenSubscription,
  type BillingSnapshot,
} from "@/lib/stripe/billing-snapshot";
import { logError } from "@/lib/observability/log";

export type { BillingSnapshot };
export { billingSnapshotFromSubscriptions };

type ServiceClient = SupabaseClient<Database>;

const BUSINESS_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Authoritative plan for a Stripe customer from the live subscription list.
 * Survives event replay and multi-subscription customers.
 */
export async function listCustomerSubscriptions(
  customerId: string,
  stripe: Stripe = getStripe(),
): Promise<Stripe.Subscription[]> {
  const subscriptions: Stripe.Subscription[] = [];
  let startingAfter: string | undefined;

  // Bounded so a pathological account cannot spin the webhook forever.
  for (let page = 0; page < 10; page++) {
    const { data, has_more } = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    subscriptions.push(...data);
    if (!has_more || data.length === 0) {
      return subscriptions;
    }
    if (page === 9 && has_more) {
      throw new Error("stripe_subscriptions_pagination_exceeded");
    }
    startingAfter = data[data.length - 1]!.id;
  }

  return subscriptions;
}

export async function billingSnapshotForCustomer(
  customerId: string,
  stripe: Stripe = getStripe(),
): Promise<BillingSnapshot> {
  const subscriptions = await listCustomerSubscriptions(customerId, stripe);
  return billingSnapshotFromSubscriptions(subscriptions);
}

/** True when the customer currently has Pro access (active/trialing/past_due). */
export async function customerHasLiveSubscription(
  customerId: string,
  stripe: Stripe = getStripe(),
): Promise<boolean> {
  const snap = await billingSnapshotForCustomer(customerId, stripe);
  return snap.plan === "pro";
}

/**
 * True when Checkout must not create another subscription (portal instead).
 * Includes past_due / unpaid / incomplete / paused.
 */
export async function customerHasOpenSubscription(
  customerId: string,
  stripe: Stripe = getStripe(),
): Promise<boolean> {
  const subscriptions = await listCustomerSubscriptions(customerId, stripe);
  return snapshotHasOpenSubscription(subscriptions);
}

/**
 * Persist billing fields. Returns false when the write fails or matches
 * zero rows — callers must fail the webhook so Stripe retries.
 */
export async function writeBusinessBilling(
  supabase: ServiceClient,
  input: {
    businessId?: string | null;
    customerId?: string | null;
    plan: "pro" | "free";
    subscriptionStatus: string;
    /** Set/overwrite the Stripe customer id when known. */
    setCustomerId?: string | null;
  },
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const patch: Database["public"]["Tables"]["business"]["Update"] = {
    plan: input.plan,
    subscription_status: input.subscriptionStatus,
  };
  if (input.setCustomerId) {
    patch.stripe_customer_id = input.setCustomerId;
  }

  if (input.businessId) {
    const { data, error } = await supabase
      .from("business")
      .update(patch)
      .eq("id", input.businessId)
      .select("id");

    if (error) return { ok: false, reason: error.message };
    if (!data?.length) return { ok: false, reason: "business_not_found" };
    return { ok: true };
  }

  if (input.customerId) {
    const { data, error } = await supabase
      .from("business")
      .update(patch)
      .eq("stripe_customer_id", input.customerId)
      .select("id");

    if (error) return { ok: false, reason: error.message };
    if (!data?.length) return { ok: false, reason: "customer_not_linked" };
    return { ok: true };
  }

  return { ok: false, reason: "missing_business_or_customer" };
}

async function businessIdFromCustomerMetadata(
  customerId: string,
  stripe: Stripe,
): Promise<string | null> {
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return null;
  const raw = customer.metadata?.paova_business_id?.trim() ?? "";
  return BUSINESS_ID_RE.test(raw) ? raw : null;
}

/**
 * Sync Paova plan from Stripe's live subscription list for one customer.
 * Never trusts a single webhook payload for plan=pro|free.
 */
export async function syncBusinessBillingFromStripe(
  supabase: ServiceClient,
  input: {
    customerId: string;
    businessId?: string | null;
    setCustomerId?: boolean;
  },
  stripe: Stripe = getStripe(),
): Promise<
  { ok: true; snapshot: BillingSnapshot } | { ok: false; reason: string }
> {
  const snapshot = await billingSnapshotForCustomer(input.customerId, stripe);

  let businessId =
    input.businessId && BUSINESS_ID_RE.test(input.businessId)
      ? input.businessId
      : null;

  const fromMeta = await businessIdFromCustomerMetadata(
    input.customerId,
    stripe,
  );

  if (businessId && fromMeta && businessId !== fromMeta) {
    return { ok: false, reason: "business_id_mismatch" };
  }

  // Prefer an already-linked customer row over a forged client_reference_id.
  const { data: linkedRow } = await supabase
    .from("business")
    .select("id")
    .eq("stripe_customer_id", input.customerId)
    .maybeSingle();

  if (linkedRow?.id) {
    if (businessId && businessId !== linkedRow.id) {
      return { ok: false, reason: "customer_linked_to_other_business" };
    }
    businessId = linkedRow.id;
  } else if (!businessId) {
    businessId = fromMeta;
  }

  let written = await writeBusinessBilling(supabase, {
    businessId,
    customerId: businessId ? null : input.customerId,
    plan: snapshot.plan,
    subscriptionStatus: snapshot.subscription_status,
    setCustomerId: input.setCustomerId ? input.customerId : null,
  });

  // subscription.* can arrive before checkout linked the customer on business.
  if (
    !written.ok &&
    written.reason === "customer_not_linked" &&
    fromMeta
  ) {
    written = await writeBusinessBilling(supabase, {
      businessId: fromMeta,
      plan: snapshot.plan,
      subscriptionStatus: snapshot.subscription_status,
      setCustomerId: input.customerId,
    });
  }

  if (!written.ok) return written;
  return { ok: true, snapshot };
}

/**
 * Claim an event id for processing (migration 0038).
 *
 * A claim is not proof of completion: only `complete_stripe_webhook_event`
 * marks an event done. A claim left unfinished by a crashed or timed-out run
 * becomes reclaimable after the stale window, so Stripe's retry can finish the
 * work instead of being waved through as a duplicate.
 */
export async function claimStripeWebhookEvent(
  supabase: ServiceClient,
  event: Pick<Stripe.Event, "id" | "type">,
): Promise<"claimed" | "duplicate" | { error: string }> {
  const { data, error } = await supabase.rpc("claim_stripe_webhook_event", {
    p_event_id: event.id,
    p_event_type: event.type,
    p_stale_after_seconds: 120,
  });

  if (error) return { error: error.message };
  return data === true ? "claimed" : "duplicate";
}

/** Mark the event finished; later deliveries are then true duplicates. */
export async function completeStripeWebhookEvent(
  supabase: ServiceClient,
  eventId: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const { error } = await supabase.rpc("complete_stripe_webhook_event", {
    p_event_id: eventId,
  });
  if (error) {
    logError("stripe.complete_event_failed", error.message, { eventId });
    return { ok: false, reason: error.message };
  }
  return { ok: true };
}

/**
 * Drop the claim so Stripe's retry can re-process immediately after a handled
 * failure, without waiting for the stale window.
 */
export async function releaseStripeWebhookEvent(
  supabase: ServiceClient,
  eventId: string,
): Promise<void> {
  const { error } = await supabase
    .from("stripe_webhook_event")
    .delete()
    .eq("id", eventId);
  if (error) {
    logError("stripe.release_event_failed", error.message, { eventId });
  }
}
