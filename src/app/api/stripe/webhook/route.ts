import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import {
  claimStripeWebhookEvent,
  releaseStripeWebhookEvent,
  syncBusinessBillingFromStripe,
} from "@/lib/stripe/sync-business-plan";

/**
 * Stripe webhook endpoint.
 *
 * Verifies the signature, claims event.id for at-most-once handling, then
 * reconciles `business.plan` from Stripe's live subscription list (never from
 * the event payload alone).
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

  const claim = await claimStripeWebhookEvent(supabase, event);
  if (claim === "duplicate") {
    return NextResponse.json({ received: true, duplicate: true });
  }
  if (typeof claim === "object") {
    return NextResponse.json({ error: claim.error }, { status: 500 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const businessId = session.client_reference_id;
        const customerId =
          typeof session.customer === "string" ? session.customer : null;

        if (!customerId) {
          await releaseStripeWebhookEvent(supabase, event.id);
          return NextResponse.json(
            { error: "checkout_missing_customer" },
            { status: 500 },
          );
        }

        const result = await syncBusinessBillingFromStripe(supabase, {
          customerId,
          businessId: businessId || null,
          setCustomerId: true,
        });
        if (!result.ok) {
          await releaseStripeWebhookEvent(supabase, event.id);
          return NextResponse.json(
            { error: result.reason },
            { status: 500 },
          );
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === "string" ? sub.customer : null;
        if (!customerId) {
          await releaseStripeWebhookEvent(supabase, event.id);
          return NextResponse.json(
            { error: "subscription_missing_customer" },
            { status: 500 },
          );
        }

        const result = await syncBusinessBillingFromStripe(supabase, {
          customerId,
        });
        if (!result.ok) {
          await releaseStripeWebhookEvent(supabase, event.id);
          return NextResponse.json(
            { error: result.reason },
            { status: 500 },
          );
        }
        break;
      }

      default:
        // Unhandled types are still claimed so Stripe stops retrying them.
        break;
    }
  } catch (err) {
    await releaseStripeWebhookEvent(supabase, event.id);
    const message =
      err instanceof Error ? err.message : "webhook_handler_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
