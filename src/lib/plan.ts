/** Free plan: number of signatures allowed per calendar month. */
export const FREE_MONTHLY_LIMIT = 10;

/** Pro plan display price (EUR / month). Keep in sync with Stripe. */
export const PRO_PRICE_EUR = 19;

type PlanFields = {
  plan?: string | null;
  subscription_status?: string | null;
};

/** A business owner is "pro" (unlimited) once their profile plan is set to pro. */
export function isPro(profile: PlanFields | null | undefined): boolean {
  return profile?.plan === "pro";
}

/** ISO timestamp for the first instant of the current month (UTC). */
export function currentMonthStartISO(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}
