import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { getStripe } from "@/lib/stripe/server";
import {
  billingSnapshotFromSubscriptions,
  type BillingSnapshot,
} from "@/lib/stripe/billing-snapshot";

export type { BillingSnapshot };
export { billingSnapshotFromSubscriptions };

type ServiceClient = SupabaseClient<Database>;

const BUSINESS_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Authoritative plan for a Stripe customer: Pro only if at least one
 * subscription is still active or trialing. Survives event replay and
 * multi-subscription customers (cancel one, keep the other).
 */
export async function billingSnapshotForCustomer(
  customerId: string,
  stripe: Stripe = getStripe(),
): Promise<BillingSnapshot> {
  const { data } = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 20,
  });
  return billingSnapshotFromSubscriptions(data);
}

export async function customerHasLiveSubscription(
  customerId: string,
  stripe: Stripe = getStripe(),
): Promise<boolean> {
  const snap = await billingSnapshotForCustomer(customerId, stripe);
  return snap.plan === "pro";
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

  let written = await writeBusinessBilling(supabase, {
    businessId: input.businessId,
    customerId: input.businessId ? null : input.customerId,
    plan: snapshot.plan,
    subscriptionStatus: snapshot.subscription_status,
    setCustomerId: input.setCustomerId ? input.customerId : null,
  });

  // subscription.* can arrive before checkout linked the customer on business.
  // Recover via metadata set at customers.create.
  if (
    !written.ok &&
    written.reason === "customer_not_linked" &&
    !input.businessId
  ) {
    const fromMeta = await businessIdFromCustomerMetadata(
      input.customerId,
      stripe,
    );
    if (fromMeta) {
      written = await writeBusinessBilling(supabase, {
        businessId: fromMeta,
        plan: snapshot.plan,
        subscriptionStatus: snapshot.subscription_status,
        setCustomerId: input.customerId,
      });
    }
  }

  if (!written.ok) return written;
  return { ok: true, snapshot };
}

/** Claim an event id. Duplicates return "duplicate"; caller should ack 200. */
export async function claimStripeWebhookEvent(
  supabase: ServiceClient,
  event: Pick<Stripe.Event, "id" | "type">,
): Promise<"claimed" | "duplicate" | { error: string }> {
  const { error } = await supabase.from("stripe_webhook_event").insert({
    id: event.id,
    event_type: event.type,
  });
  if (!error) return "claimed";
  if (error.code === "23505") return "duplicate";
  return { error: error.message };
}

/** Drop the claim so Stripe's retry can re-process after a failed sync. */
export async function releaseStripeWebhookEvent(
  supabase: ServiceClient,
  eventId: string,
): Promise<void> {
  await supabase.from("stripe_webhook_event").delete().eq("id", eventId);
}
