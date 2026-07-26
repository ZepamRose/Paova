import Link from "next/link";
import { requireDashboardCapability } from "@/lib/auth/session";
import { isPro, FREE_MONTHLY_LIMIT, PRO_PRICE_EUR, currentMonthStartISO } from "@/lib/plan";
import { createCheckoutSession, createPortalSession } from "./actions";
import { BillingFaq } from "./billing-faq";

function Check() {
  return (
    <span
      className="mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center text-[var(--color-brand)]"
      aria-hidden
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </span>
  );
}

function Price({ amount }: { amount: string | number }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[1.75rem] font-semibold tracking-tight text-[var(--color-foreground)] sm:text-[1.875rem]">
        {amount}&nbsp;€
      </span>
      <span className="text-[13px] font-normal text-[var(--color-muted)]/75">
        /mois
      </span>
    </div>
  );
}

const btnEase =
  "transition-[transform,background-color,border-color,box-shadow,filter,opacity] duration-[200ms] ease-[cubic-bezier(0.22,1,0.36,1)]";

const btnSecondary = `inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-medium text-[var(--color-foreground)] shadow-[0_1px_2px_rgba(0,0,0,0.03)] ${btnEase} hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--color-border)_55%,var(--color-muted))] hover:bg-[color-mix(in_srgb,var(--color-surface)_70%,white)] hover:shadow-[0_4px_14px_-6px_rgba(0,0,0,0.14)] dark:hover:bg-[color-mix(in_srgb,var(--color-surface)_88%,white)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:translate-y-0 active:scale-[0.99]`;

const btnPrimary = `inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-[var(--color-brand)] px-5 py-2.5 text-sm font-medium text-[var(--color-on-brand)] shadow-[0_1px_2px_rgba(0,0,0,0.06)] ${btnEase} hover:-translate-y-px hover:brightness-[1.06] hover:shadow-[0_10px_22px_-10px_color-mix(in_srgb,var(--color-brand)_55%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:translate-y-0 active:scale-[0.99]`;

const planBadge =
  "rounded-md bg-[color-mix(in_srgb,var(--color-brand)_14%,transparent)] px-2.5 py-[3px] text-[11px] font-semibold tracking-wide text-[var(--color-brand)] ring-1 ring-[color-mix(in_srgb,var(--color-brand)_32%,transparent)]";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string }>;
}) {
  const { success, canceled } = await searchParams;
  const { supabase, membership } =
    await requireDashboardCapability("manage_billing");

  const { data: business } = await supabase
    .from("business")
    .select("id, plan, subscription_status")
    .eq("id", membership.businessId)
    .maybeSingle();

  const pro = isPro(business);
  const status = business?.subscription_status ?? null;
  const renewing =
    pro && (!status || status === "active" || status === "trialing");
  const pastDue = status === "past_due";
  const showCheckoutSuccess = Boolean(success) && pro;
  const showCheckoutPending = Boolean(success) && !pro;

  let usedThisMonth = 0;
  if (business) {
    const { count } = await supabase
      .from("submission")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .gte("signed_at", currentMonthStartISO());
    usedThisMonth = count ?? 0;
  }

  const usagePct = Math.min(100, (usedThisMonth / FREE_MONTHLY_LIMIT) * 100);
  const nearLimit = !pro && usedThisMonth >= FREE_MONTHLY_LIMIT * 0.8;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-7 px-5 py-7 sm:gap-8 sm:px-6 sm:py-9">
      <header className="flex flex-col gap-3">
        <Link
          href="/dashboard"
          className="w-fit text-sm text-[var(--color-muted)]/80 transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-[var(--color-foreground)] focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
        >
          ← Retour au tableau de bord
        </Link>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[1.65rem] font-semibold tracking-tight sm:text-[1.85rem]">
            Facturation
          </h1>
          <p className="max-w-xl text-[14px] leading-snug text-[var(--color-muted)]">
            {pro
              ? "Votre offre Pro, vos factures et la gestion de l’abonnement."
              : "Suivez votre usage et passez à Pro quand vous avez besoin de signatures illimitées."}
          </p>
        </div>
      </header>

      {showCheckoutSuccess ? (
        <p className="rounded-xl border border-[color-mix(in_srgb,var(--color-brand)_25%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand)_8%,var(--color-surface))] px-4 py-3 text-sm leading-relaxed">
          Abonnement activé, merci ! Vos signatures sont désormais illimitées.
        </p>
      ) : null}
      {showCheckoutPending ? (
        <p className="rounded-xl border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[var(--color-surface-2)] px-4 py-3 text-sm leading-relaxed text-[var(--color-muted)]">
          Paiement reçu — finalisation en cours. Actualisez dans quelques
          secondes si l&apos;offre Pro n&apos;apparaît pas encore.
        </p>
      ) : null}
      {pastDue ? (
        <p className="rounded-xl border border-[color-mix(in_srgb,#b45309_25%,var(--color-border))] bg-[color-mix(in_srgb,#b45309_8%,var(--color-background))] px-4 py-3 text-sm leading-relaxed text-[#92400e] dark:text-[#fbbf24]">
          Paiement en retard. Mettez à jour votre moyen de paiement via le
          portail Stripe — un nouvel abonnement n&apos;est pas nécessaire.
        </p>
      ) : null}
      {canceled ? (
        <p className="rounded-xl border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[var(--color-surface-2)] px-4 py-3 text-sm leading-relaxed text-[var(--color-muted)]">
          Paiement annulé. Vous êtes toujours sur l&apos;offre gratuite.
        </p>
      ) : null}

      <section className="flex flex-col gap-4 rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_85%,var(--color-foreground))] bg-[var(--color-surface)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_10px_28px_-16px_rgba(0,0,0,0.1)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
          <div className="flex min-w-0 flex-col gap-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]/75">
              Offre actuelle
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[1.35rem] font-semibold tracking-tight sm:text-[1.45rem]">
                Plan {pro ? "Pro" : "Gratuit"}
              </h2>
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide ${
                  pro
                    ? "bg-[color-mix(in_srgb,var(--color-brand)_14%,transparent)] text-[var(--color-brand)] ring-1 ring-[color-mix(in_srgb,var(--color-brand)_28%,transparent)]"
                    : "bg-[var(--color-surface-2)] text-[var(--color-muted)] ring-1 ring-[color-mix(in_srgb,var(--color-border)_80%,transparent)]"
                }`}
              >
                {pro ? (
                  <>
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    Actif
                  </>
                ) : (
                  "Limité"
                )}
              </span>
            </div>
            <p className="text-[13px] leading-relaxed text-[var(--color-muted)]/85">
              {pro
                ? renewing
                  ? "Signatures illimitées · renouvellement automatique"
                  : `Signatures illimitées · statut : ${status}`
                : `${FREE_MONTHLY_LIMIT} signatures par mois calendaire.`}
            </p>
          </div>

          {pro || pastDue ? (
            <form action={createPortalSession} className="shrink-0">
              <button type="submit" className={btnSecondary}>
                {pastDue ? "Mettre à jour le paiement" : "Gérer mon abonnement"}
              </button>
            </form>
          ) : (
            <form action={createCheckoutSession} className="shrink-0">
              <button type="submit" className={`${btnPrimary} w-auto`}>
                Passer à Pro
              </button>
            </form>
          )}
        </div>

        {!pro ? (
          <div className="flex flex-col gap-2 rounded-xl bg-[color-mix(in_srgb,var(--color-surface-2)_80%,var(--color-background))] px-4 py-3 sm:px-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium tracking-tight">Usage ce mois-ci</span>
              <span className="tabular-nums text-[var(--color-muted)]/85">
                {usedThisMonth} / {FREE_MONTHLY_LIMIT} signatures
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--color-border)_80%,transparent)]">
              <div
                className="h-full rounded-full bg-[var(--color-brand)] transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ width: `${usagePct}%` }}
              />
            </div>
            <p className="text-[12px] leading-relaxed text-[var(--color-muted)]/75">
              {nearLimit
                ? "Vous approchez de la limite. Passez à Pro pour ne plus être bloqué."
                : "Le compteur se remet à zéro au début de chaque mois."}
            </p>
          </div>
        ) : (
          <p className="rounded-xl bg-[color-mix(in_srgb,var(--color-surface-2)_80%,var(--color-background))] px-4 py-3 text-[13px] leading-relaxed text-[var(--color-muted)]/85">
            Factures, moyen de paiement et résiliation : portail Stripe
            sécurisé.
          </p>
        )}
      </section>

      {!pro ? (
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold tracking-tight sm:text-lg">
              Comparer les offres
            </h2>
            <p className="text-[13px] leading-snug text-[var(--color-muted)]/85">
              Commencez gratuitement, évoluez quand votre volume augmente.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 sm:gap-3.5">
            <div className="flex flex-col gap-3.5 rounded-2xl border border-[var(--color-brand)] bg-[var(--color-surface)] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_10px_28px_-16px_rgba(0,0,0,0.08)] sm:p-5">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-[var(--color-muted)]">
                    Gratuit
                  </span>
                  <span className={planBadge}>Plan actuel</span>
                </div>
                <Price amount={0} />
              </div>
              <ul className="flex flex-col gap-1.5 text-[13px] text-[var(--color-muted)]/90">
                <li className="flex gap-2">
                  <Check /> {FREE_MONTHLY_LIMIT} signatures / mois
                </li>
                <li className="flex gap-2">
                  <Check /> Décharges illimitées
                </li>
                <li className="flex gap-2">
                  <Check /> PDF, QR code & export CSV
                </li>
                <li className="flex gap-2">
                  <Check /> Mode borne
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-3.5 rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_85%,transparent)] bg-[var(--color-surface)] p-4 sm:p-5">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-semibold tracking-tight text-[var(--color-foreground)]">
                    Pro
                    <span className="rounded-md bg-[color-mix(in_srgb,var(--color-brand)_12%,transparent)] px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-[var(--color-brand)] ring-1 ring-[color-mix(in_srgb,var(--color-brand)_22%,transparent)]">
                      Populaire
                    </span>
                  </span>
                </div>
                <Price amount={PRO_PRICE_EUR} />
                <p className="text-[12.5px] leading-snug text-[var(--color-muted)]/75">
                  Sans engagement · résiliable à tout moment
                </p>
              </div>
              <ul className="flex flex-col gap-1.5 text-[13px] text-[var(--color-muted)]/90">
                <li className="flex gap-2">
                  <Check /> Tout l&apos;offre Gratuite
                </li>
                <li className="flex gap-2">
                  <Check /> Signatures illimitées
                </li>
                <li className="flex gap-2">
                  <Check /> Personnalisation marque
                </li>
                <li className="flex gap-2">
                  <Check /> Support prioritaire
                </li>
              </ul>
              <form action={createCheckoutSession} className="mt-0.5">
                <button type="submit" className={btnPrimary}>
                  Passer à Pro
                </button>
              </form>
            </div>
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-3.5">
        <h2 className="text-base font-semibold tracking-tight sm:text-lg">
          Questions fréquentes
        </h2>
        <BillingFaq />
      </section>
    </main>
  );
}
