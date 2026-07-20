"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";
import { env } from "@/lib/env";

async function getUserAndProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, stripe_customer_id, plan")
    .eq("id", user.id)
    .maybeSingle();

  return { supabase, user, profile };
}

export async function createCheckoutSession() {
  const { supabase, user, profile } = await getUserAndProfile();
  const stripe = getStripe();

  let customerId = profile?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? profile?.email ?? undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await supabase
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: env.stripe.priceId(), quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${env.appUrl}/dashboard/billing?success=1`,
    cancel_url: `${env.appUrl}/dashboard/billing?canceled=1`,
  });

  if (!session.url) {
    throw new Error("Impossible de créer la session de paiement.");
  }

  redirect(session.url);
}

export async function createPortalSession() {
  const { profile } = await getUserAndProfile();
  const stripe = getStripe();

  if (!profile?.stripe_customer_id) {
    redirect("/dashboard/billing");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${env.appUrl}/dashboard/billing`,
  });

  redirect(session.url);
}
