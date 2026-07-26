import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { openSubscriptionCheckoutUrl } from "./open-checkout.ts";

type FakeSession = {
  id: string;
  mode: string;
  status: string;
  created: number;
  url: string | null;
};

function fakeStripe(state: {
  open: FakeSession[];
  expired: string[];
  create?: () => FakeSession;
}) {
  return {
    checkout: {
      sessions: {
        list: async () => ({
          data: state.open.filter((s) => s.status === "open"),
        }),
        create: async () => {
          const created = state.create!();
          state.open.push(created);
          return created;
        },
        expire: async (id: string) => {
          state.expired.push(id);
          const row = state.open.find((s) => s.id === id);
          if (row) row.status = "expired";
          return row;
        },
      },
    },
  };
}

describe("openSubscriptionCheckoutUrl", () => {
  it("reuses an existing open subscription session without creating", async () => {
    const state = {
      open: [
        {
          id: "cs_existing",
          mode: "subscription",
          status: "open",
          created: 100,
          url: "https://checkout.stripe.com/cs_existing",
        },
      ] as FakeSession[],
      expired: [] as string[],
      create: () => {
        throw new Error("should not create");
      },
    };

    const url = await openSubscriptionCheckoutUrl(
      "cus_1",
      async () => state.create(),
      fakeStripe(state) as never,
    );

    assert.equal(url, "https://checkout.stripe.com/cs_existing");
    assert.deepEqual(state.expired, []);
  });

  it("creates when none are open", async () => {
    const state = {
      open: [] as FakeSession[],
      expired: [] as string[],
      create: () => ({
        id: "cs_new",
        mode: "subscription",
        status: "open",
        created: 200,
        url: "https://checkout.stripe.com/cs_new",
      }),
    };

    const url = await openSubscriptionCheckoutUrl(
      "cus_1",
      async () => {
        const created = state.create();
        state.open.push(created);
        return created as never;
      },
      fakeStripe(state) as never,
    );

    assert.equal(url, "https://checkout.stripe.com/cs_new");
  });

  it("keeps the newest open session and expires older duplicates", async () => {
    const state = {
      open: [
        {
          id: "cs_old",
          mode: "subscription",
          status: "open",
          created: 100,
          url: "https://checkout.stripe.com/cs_old",
        },
        {
          id: "cs_new",
          mode: "subscription",
          status: "open",
          created: 200,
          url: "https://checkout.stripe.com/cs_new",
        },
      ] as FakeSession[],
      expired: [] as string[],
    };

    const url = await openSubscriptionCheckoutUrl(
      "cus_1",
      async () => {
        throw new Error("should not create");
      },
      fakeStripe(state) as never,
    );

    assert.equal(url, "https://checkout.stripe.com/cs_new");
    assert.deepEqual(state.expired, ["cs_old"]);
  });
});
