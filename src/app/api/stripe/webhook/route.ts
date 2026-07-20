import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/server";
import { env } from "@/lib/env";

/**
 * Stripe webhook endpoint (stub).
 *
 * Verifies the signature and acknowledges events. Business handling
 * (subscription created/updated/canceled -> update `profiles`) is intentionally
 * NOT implemented yet.
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      env.stripe.webhookSecret(),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      // TODO: sync subscription state to the `profiles` table.
      break;
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
