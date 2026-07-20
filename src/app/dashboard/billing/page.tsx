import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FREE_MONTHLY_LIMIT, isPro, currentMonthStartISO } from "@/lib/plan";
import { createCheckoutSession, createPortalSession } from "./actions";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string }>;
}) {
  const { success, canceled } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, subscription_status")
    .eq("id", user.id)
    .maybeSingle();

  const pro = isPro(profile);

  const { data: business } = await supabase
    .from("business")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  let usedThisMonth = 0;
  if (business) {
    const { count } = await supabase
      .from("submission")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .gte("signed_at", currentMonthStartISO());
    usedThisMonth = count ?? 0;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-12">
      <div className="flex flex-col gap-1">
        <Link
          href="/dashboard"
          className="text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-foreground)]"
        >
          ← Retour au tableau de bord
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Facturation</h1>
      </div>

      {success && (
        <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          Abonnement activé, merci ! Vos signatures sont désormais illimitées.
        </p>
      )}
      {canceled && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Paiement annulé. Vous êtes toujours sur l&apos;offre gratuite.
        </p>
      )}

      <section className="flex flex-col gap-4 rounded-xl border border-[var(--color-border)] p-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Offre actuelle</span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              pro
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {pro ? "Pro" : "Gratuit"}
          </span>
        </div>

        {!pro && (
          <div className="flex flex-col gap-1">
            <span className="text-sm text-[var(--color-muted)]">
              Signatures ce mois-ci : {usedThisMonth} / {FREE_MONTHLY_LIMIT}
            </span>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full bg-[var(--color-brand)]"
                style={{
                  width: `${Math.min(
                    100,
                    (usedThisMonth / FREE_MONTHLY_LIMIT) * 100,
                  )}%`,
                }}
              />
            </div>
          </div>
        )}

        {pro ? (
          <form action={createPortalSession}>
            <button
              type="submit"
              className="rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
            >
              Gérer mon abonnement
            </button>
          </form>
        ) : (
          <form action={createCheckoutSession} className="flex flex-col gap-3">
            <p className="text-sm text-[var(--color-muted)]">
              Passez à l&apos;offre Pro pour des signatures illimitées.
            </p>
            <button
              type="submit"
              className="self-start rounded-lg bg-[var(--color-brand)] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Passer à Pro
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
