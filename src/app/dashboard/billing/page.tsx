import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  FREE_MONTHLY_LIMIT,
  PRO_PRICE_EUR,
  isPro,
  currentMonthStartISO,
} from "@/lib/plan";
import { createCheckoutSession, createPortalSession } from "./actions";
import { BillingFaq } from "./billing-faq";

/** Lucide Check — stroke icon, no extra dependency. */
function Check({ included = true }: { included?: boolean }) {
  if (!included) {
    return (
      <span
        className="mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center text-[var(--color-muted)]/45"
        aria-hidden
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M5 12h14" />
        </svg>
      </span>
    );
  }
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

function FeatureRow({
  label,
  free,
  pro,
}: {
  label: string;
  free: boolean | string;
  pro: boolean | string;
}) {
  return (
    <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr] gap-3 border-b border-[color-mix(in_srgb,var(--color-border)_32%,transparent)] py-2.5 text-sm last:border-0 sm:gap-4 sm:py-3">
      <span className="text-[var(--color-foreground)]">{label}</span>
      <span className="flex items-start gap-1.5 text-[var(--color-muted)]/85">
        {typeof free === "string" ? (
          free
        ) : (
          <>
            <Check included={free} />
            <span className="sr-only">{free ? "Inclus" : "Non inclus"}</span>
          </>
        )}
      </span>
      <span className="flex items-start gap-1.5 text-[var(--color-muted)]/85">
        {typeof pro === "string" ? (
          pro
        ) : (
          <>
            <Check included={pro} />
            <span className="sr-only">{pro ? "Inclus" : "Non inclus"}</span>
          </>
        )}
      </span>
    </div>
  );
}

function Price({ amount }: { amount: string | number }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[1.875rem] font-semibold tracking-tight text-[var(--color-foreground)] sm:text-[2rem]">
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

function SubscriptionSummary({
  pro,
  status,
}: {
  pro: boolean;
  status: string | null;
}) {
  const renewing =
    pro && (!status || status === "active" || status === "trialing");

  return (
    <div className="flex flex-col gap-1.5 border-t border-[color-mix(in_srgb,var(--color-border)_45%,transparent)] pt-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-muted)]/70">
        Votre abonnement
      </p>
      <p className="text-[15px] font-semibold tracking-tight text-[var(--color-foreground)]">
        Plan {pro ? "Pro" : "Gratuit"}
      </p>
      {pro ? (
        <p className="flex items-center gap-1.5 text-[13px] text-[var(--color-muted)]/85">
          {renewing ? (
            <>
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[var(--color-brand)]"
                aria-hidden
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
              Renouvellement automatique activé
            </>
          ) : (
            <span className="text-[var(--color-muted)]/75">
              Statut&nbsp;: {status}
            </span>
          )}
        </p>
      ) : (
        <p className="text-[13px] text-[var(--color-muted)]/80">
          {FREE_MONTHLY_LIMIT} signatures par mois · sans carte bancaire
        </p>
      )}
    </div>
  );
}

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
  const status = profile?.subscription_status ?? null;

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

  const usagePct = Math.min(100, (usedThisMonth / FREE_MONTHLY_LIMIT) * 100);
  const nearLimit = !pro && usedThisMonth >= FREE_MONTHLY_LIMIT * 0.8;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-11 px-5 py-10 sm:gap-12 sm:px-6 sm:py-12">
      <header className="flex flex-col gap-5">
        <Link
          href="/dashboard"
          className="w-fit text-sm text-[var(--color-muted)]/80 transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-[var(--color-foreground)] focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
        >
          ← Retour au tableau de bord
        </Link>
        <div className="flex flex-col gap-2">
          <h1 className="text-[1.75rem] font-semibold tracking-tight sm:text-[2rem]">
            Facturation
          </h1>
          <p className="max-w-xl text-[15px] leading-relaxed text-[var(--color-muted)]">
            Gérez votre offre, suivez votre usage du mois, et passez à Pro quand
            vous avez besoin de signatures illimitées.
          </p>
        </div>
        <SubscriptionSummary pro={pro} status={status} />
      </header>

      {success ? (
        <p className="rounded-xl border border-[color-mix(in_srgb,var(--color-brand)_25%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand)_8%,var(--color-surface))] px-4 py-3.5 text-sm leading-relaxed">
          Abonnement activé, merci ! Vos signatures sont désormais illimitées.
        </p>
      ) : null}
      {canceled ? (
        <p className="rounded-xl border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[var(--color-surface-2)] px-4 py-3.5 text-sm leading-relaxed text-[var(--color-muted)]">
          Paiement annulé. Vous êtes toujours sur l&apos;offre gratuite.
        </p>
      ) : null}

      {/* Current plan */}
      <section className="flex flex-col gap-5 rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_85%,var(--color-foreground))] bg-[var(--color-surface)] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_10px_28px_-16px_rgba(0,0,0,0.1)] sm:gap-6 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="flex flex-col gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]/75">
              Offre actuelle
            </span>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-[1.5rem] font-semibold tracking-tight sm:text-[1.625rem]">
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
            <div className="flex flex-col gap-1.5">
              <p className="text-[13px] leading-relaxed text-[var(--color-muted)]/85 sm:text-sm">
                {pro
                  ? "Signatures illimitées, sans plafond mensuel."
                  : `${FREE_MONTHLY_LIMIT} signatures par mois calendaire.`}
              </p>
              {pro && status ? (
                <p className="text-[12px] text-[var(--color-muted)]/65">
                  Statut Stripe : {status}
                </p>
              ) : null}
            </div>
          </div>

          {pro ? (
            <form action={createPortalSession} className="shrink-0">
              <button type="submit" className={btnSecondary}>
                Gérer mon abonnement
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
          <div className="flex flex-col gap-2.5 rounded-xl bg-[color-mix(in_srgb,var(--color-surface-2)_80%,var(--color-background))] px-4 py-3.5 sm:px-5">
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
        ) : null}

        {pro ? (
          <div className="rounded-xl bg-[color-mix(in_srgb,var(--color-surface-2)_80%,var(--color-background))] px-4 py-3.5 text-[13px] leading-relaxed text-[var(--color-muted)]/85 sm:px-5 sm:text-sm">
            Factures, moyen de paiement et résiliation : tout se gère dans le
            portail Stripe sécurisé.
          </div>
        ) : null}
      </section>

      {/* Plans comparison */}
      <section className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
            Comparer les offres
          </h2>
          <p className="text-sm leading-relaxed text-[var(--color-muted)]/85">
            Commencez gratuitement, évoluez quand votre volume augmente.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 sm:gap-4">
          {/* Free */}
          <div
            className={`flex flex-col gap-4 rounded-2xl border p-5 sm:p-5 ${
              !pro
                ? "border-[var(--color-brand)] bg-[var(--color-surface)] shadow-[0_1px_2px_rgba(0,0,0,0.03),0_10px_28px_-16px_rgba(0,0,0,0.08)]"
                : "border-[color-mix(in_srgb,var(--color-border)_85%,transparent)] bg-[var(--color-surface)]"
            }`}
          >
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-[var(--color-muted)]">
                  Gratuit
                </span>
                {!pro ? (
                  <span className={planBadge}>Plan actuel</span>
                ) : null}
              </div>
              <Price amount={0} />
            </div>
            <ul className="flex flex-col gap-2 text-sm text-[var(--color-muted)]/90">
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

          {/* Pro */}
          <div
            className={`flex flex-col gap-4 rounded-2xl border p-5 sm:p-5 ${
              pro
                ? "border-[var(--color-brand)] bg-[var(--color-surface)] shadow-[0_1px_2px_rgba(0,0,0,0.03),0_10px_28px_-16px_rgba(0,0,0,0.08)]"
                : "border-[color-mix(in_srgb,var(--color-border)_85%,transparent)] bg-[var(--color-surface)]"
            }`}
          >
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-semibold tracking-tight text-[var(--color-foreground)]">
                  Pro
                  <span className="rounded-md bg-[color-mix(in_srgb,var(--color-brand)_12%,transparent)] px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-[var(--color-brand)] ring-1 ring-[color-mix(in_srgb,var(--color-brand)_22%,transparent)]">
                    Populaire
                  </span>
                </span>
                {pro ? (
                  <span className={planBadge}>Plan actuel</span>
                ) : null}
              </div>
              <Price amount={PRO_PRICE_EUR} />
              <p className="text-[13px] leading-relaxed text-[var(--color-muted)]/75">
                Sans engagement · résiliable à tout moment
              </p>
            </div>
            <ul className="flex flex-col gap-2 text-sm text-[var(--color-muted)]/90">
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
            {!pro ? (
              <form action={createCheckoutSession} className="mt-1">
                <button type="submit" className={btnPrimary}>
                  Passer à Pro
                </button>
              </form>
            ) : (
              <form action={createPortalSession} className="mt-1">
                <button type="submit" className={`${btnSecondary} w-full`}>
                  Gérer mon abonnement
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Detail table */}
      <section className="flex flex-col gap-4 rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_80%,transparent)] bg-[var(--color-surface)] p-5 sm:p-6">
        <h2 className="text-base font-semibold tracking-tight sm:text-lg">
          Détail des fonctionnalités
        </h2>
        <div>
          <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr] gap-3 border-b border-[color-mix(in_srgb,var(--color-border)_40%,transparent)] pb-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]/65 sm:gap-4">
            <span>Fonctionnalité</span>
            <span>Gratuit</span>
            <span>Pro</span>
          </div>
          <FeatureRow
            label="Signatures / mois"
            free={`${FREE_MONTHLY_LIMIT}`}
            pro="Illimité"
          />
          <FeatureRow label="Décharges" free pro />
          <FeatureRow label="PDF horodaté" free pro />
          <FeatureRow label="QR code & mode borne" free pro />
          <FeatureRow label="Export CSV" free pro />
          <FeatureRow label="Logo & couleurs" free pro />
          <FeatureRow label="Email de confirmation" free pro />
          <FeatureRow label="Support prioritaire" free={false} pro />
        </div>
      </section>

      {/* FAQ */}
      <section className="flex flex-col gap-5">
        <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
          Questions fréquentes
        </h2>
        <BillingFaq />
      </section>
    </main>
  );
}
