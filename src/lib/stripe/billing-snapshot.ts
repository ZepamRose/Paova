export type BillingSnapshot = {
  plan: "pro" | "free";
  subscription_status: string;
};

/**
 * Pure decision: Pro only if at least one subscription is active or trialing.
 * Used by the Stripe sync path and unit-tested without loading the Stripe SDK.
 */
export function billingSnapshotFromSubscriptions(
  subscriptions: ReadonlyArray<{ status: string }>,
): BillingSnapshot {
  const live = subscriptions.find(
    (sub) => sub.status === "active" || sub.status === "trialing",
  );
  if (live) {
    return { plan: "pro", subscription_status: live.status };
  }
  return {
    plan: "free",
    subscription_status: subscriptions[0]?.status ?? "inactive",
  };
}
