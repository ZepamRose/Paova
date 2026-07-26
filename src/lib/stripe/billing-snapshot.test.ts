import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  billingSnapshotFromSubscriptions,
  customerHasOpenSubscription,
} from "./billing-snapshot.ts";

describe("billingSnapshotFromSubscriptions", () => {
  it("is pro when any subscription is active", () => {
    const snap = billingSnapshotFromSubscriptions([
      { status: "canceled" },
      { status: "active" },
    ]);
    assert.equal(snap.plan, "pro");
    assert.equal(snap.subscription_status, "active");
  });

  it("is pro when trialing", () => {
    const snap = billingSnapshotFromSubscriptions([{ status: "trialing" }]);
    assert.equal(snap.plan, "pro");
    assert.equal(snap.subscription_status, "trialing");
  });

  it("is pro during past_due grace", () => {
    const snap = billingSnapshotFromSubscriptions([
      { status: "canceled" },
      { status: "past_due" },
    ]);
    assert.equal(snap.plan, "pro");
    assert.equal(snap.subscription_status, "past_due");
  });

  it("is free when only canceled remain", () => {
    const snap = billingSnapshotFromSubscriptions([{ status: "canceled" }]);
    assert.equal(snap.plan, "free");
  });

  it("is free with inactive when the customer has no subscriptions", () => {
    const snap = billingSnapshotFromSubscriptions([]);
    assert.deepEqual(snap, {
      plan: "free",
      subscription_status: "inactive",
    });
  });
});

describe("customerHasOpenSubscription", () => {
  it("is true for past_due so Checkout stays blocked", () => {
    assert.equal(
      customerHasOpenSubscription([{ status: "past_due" }]),
      true,
    );
  });

  it("is false when only canceled remain", () => {
    assert.equal(
      customerHasOpenSubscription([{ status: "canceled" }]),
      false,
    );
  });
});
