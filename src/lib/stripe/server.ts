import Stripe from "stripe";
import { env } from "@/lib/env";

let stripeClient: Stripe | null = null;

/** Lazily instantiated server-side Stripe client. Server-only. */
export function getStripe(): Stripe {
  if (!stripeClient) {
    // apiVersion is intentionally omitted so it always matches the installed
    // stripe SDK default (avoids TS literal-type mismatches on first install).
    stripeClient = new Stripe(env.stripe.secretKey(), {
      typescript: true,
    });
  }
  return stripeClient;
}
