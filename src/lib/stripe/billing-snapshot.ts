export type BillingSnapshot = {
  plan: "pro" | "free";
  subscription_status: string;
};

/** Statuses that keep product access (Pro) while payment may be recovering. */
const ACCESS_STATUSES = new Set(["active", "trialing", "past_due"]);

/**
 * Statuses that mean a Stripe subscription still exists and must not be
 * replaced by a second Checkout (portal / update payment instead).
 */
const OPEN_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "incomplete",
  "paused",
]);

/**
 * Pure decision: Pro when at least one subscription grants access
 * (active, trialing, or past_due grace). Used by Stripe sync and unit tests.
 */
export function billingSnapshotFromSubscriptions(
  subscriptions: ReadonlyArray<{ status: string }>,
): BillingSnapshot {
  const access = subscriptions.find((sub) => ACCESS_STATUSES.has(sub.status));
  if (access) {
    return { plan: "pro", subscription_status: access.status };
  }
  return {
    plan: "free",
    subscription_status: subscriptions[0]?.status ?? "inactive",
  };
}

/** True when Checkout must not mint a second subscription for this customer. */
export function customerHasOpenSubscription(
  subscriptions: ReadonlyArray<{ status: string }>,
): boolean {
  return subscriptions.some((sub) => OPEN_STATUSES.has(sub.status));
}
