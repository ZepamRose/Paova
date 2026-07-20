import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

/**
 * Stripe webhook endpoint.
 *
 * Verifies the signature and syncs subscription state to the `profiles` table
 * using the service role client (no user session in a webhook request).
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

  const supabase = createServiceRoleClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      const customerId =
        typeof session.customer === "string" ? session.customer : null;

      if (userId) {
        await supabase
          .from("profiles")
          .update({
            plan: "pro",
            subscription_status: "active",
            stripe_customer_id: customerId ?? undefined,
          })
          .eq("id", userId);
      } else if (customerId) {
        await supabase
          .from("profiles")
          .update({ plan: "pro", subscription_status: "active" })
          .eq("stripe_customer_id", customerId);
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId =
        typeof sub.customer === "string" ? sub.customer : null;
      const active = sub.status === "active" || sub.status === "trialing";
      if (customerId) {
        await supabase
          .from("profiles")
          .update({
            plan: active ? "pro" : "free",
            subscription_status: sub.status,
          })
          .eq("stripe_customer_id", customerId);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId =
        typeof sub.customer === "string" ? sub.customer : null;
      if (customerId) {
        await supabase
          .from("profiles")
          .update({ plan: "free", subscription_status: "canceled" })
          .eq("stripe_customer_id", customerId);
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
