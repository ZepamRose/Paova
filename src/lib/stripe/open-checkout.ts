import type Stripe from "stripe";

/**
 * At most one open subscription Checkout Session per customer.
 * Reuses an existing open session; if several exist (parallel clicks), keeps
 * the newest and expires the rest so only one URL stays payable.
 */
export async function openSubscriptionCheckoutUrl(
  customerId: string,
  create: () => Promise<Stripe.Checkout.Session>,
  stripe: Stripe,
): Promise<string> {
  const listOpen = async () => {
    const { data } = await stripe.checkout.sessions.list({
      customer: customerId,
      status: "open",
      limit: 10,
    });
    return data.filter((session) => session.mode === "subscription");
  };

  let open = await listOpen();
  if (open.length === 0) {
    const created = await create();
    open = await listOpen();
    if (open.length === 0) {
      if (!created.url) {
        throw new Error("Impossible de créer la session de paiement.");
      }
      return created.url;
    }
  }

  open.sort((a, b) => b.created - a.created);
  const [keeper, ...duplicates] = open;
  if (duplicates.length > 0) {
    await Promise.all(
      duplicates.map((session) =>
        stripe.checkout.sessions.expire(session.id).catch(() => null),
      ),
    );
  }

  if (!keeper?.url) {
    throw new Error("Impossible de créer la session de paiement.");
  }
  return keeper.url;
}
