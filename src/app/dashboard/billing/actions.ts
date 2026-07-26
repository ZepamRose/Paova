"use server";

import { redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireActionCapability } from "@/lib/auth/session";
import { getStripe } from "@/lib/stripe/server";
import { openSubscriptionCheckoutUrl } from "@/lib/stripe/open-checkout";
import { customerHasLiveSubscription } from "@/lib/stripe/sync-business-plan";
import { env } from "@/lib/env";

/**
 * Resolve the tenant whose subscription the caller may manage.
 * Billing lives on `business` (migration 0031) and is owner-only.
 * Uses requireActionCapability so pending invites are claimed first and the
 * role always comes from business_member — never from the UI.
 */
async function getBillableBusiness() {
  const { supabase, user, membership } =
    await requireActionCapability("manage_billing");

  const { data: business } = await supabase
    .from("business")
    .select("id, name, stripe_customer_id, plan")
    .eq("id", membership.businessId)
    .maybeSingle();

  if (!business) {
    redirect("/onboarding");
  }

  return { supabase, user, business };
}

export async function createCheckoutSession() {
  const { user, business } = await getBillableBusiness();
  const stripe = getStripe();

  // Server-side guard: UI hides the CTA, but the action is still callable.
  if (business.plan === "pro") {
    redirect("/dashboard/billing");
  }

  let customerId = business.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      name: business.name,
      metadata: { paova_business_id: business.id },
    });
    customerId = customer.id;

    // Persist immediately with the service role so a second parallel checkout
    // reuses this customer instead of minting orphans (column is REVOKE'd for
    // the authenticated JWT — see migration 0031).
    const admin = createServiceRoleClient();
    const { data: linked, error } = await admin
      .from("business")
      .update({ stripe_customer_id: customerId })
      .eq("id", business.id)
      .is("stripe_customer_id", null)
      .select("id");

    if (error) {
      throw new Error("Impossible d'associer le client Stripe.");
    }
    if (!linked?.length) {
      // Another request won the race and linked a customer — reuse it.
      const { data: again } = await admin
        .from("business")
        .select("stripe_customer_id")
        .eq("id", business.id)
        .maybeSingle();
      if (!again?.stripe_customer_id) {
        throw new Error("Impossible d'associer le client Stripe.");
      }
      customerId = again.stripe_customer_id;
    }
  }

  // Re-check after resolving the customer (covers race winners + DB lag).
  if (await customerHasLiveSubscription(customerId)) {
    redirect("/dashboard/billing");
  }

  // Reuse an open session when present; expire duplicates from parallel clicks
  // so only one Checkout URL remains payable.
  const checkoutUrl = await openSubscriptionCheckoutUrl(
    customerId,
    () =>
      stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        client_reference_id: business.id,
        line_items: [{ price: env.stripe.priceId(), quantity: 1 }],
        allow_promotion_codes: true,
        success_url: `${env.appUrl}/dashboard/billing?success=1`,
        cancel_url: `${env.appUrl}/dashboard/billing?canceled=1`,
      }),
    stripe,
  );

  redirect(checkoutUrl);
}

export async function createPortalSession() {
  const { business } = await getBillableBusiness();
  const stripe = getStripe();

  if (!business.stripe_customer_id) {
    redirect("/dashboard/billing");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: business.stripe_customer_id,
    return_url: `${env.appUrl}/dashboard/billing`,
  });

  redirect(session.url);
}
