/**
 * Centralized, typed access to environment variables.
 * Client-safe values are read from NEXT_PUBLIC_* ; server-only values must
 * never be imported into client components.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",

  supabase: {
    url: () => required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: () =>
      required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    serviceRoleKey: () =>
      required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY),
  },

  stripe: {
    secretKey: () => required("STRIPE_SECRET_KEY", process.env.STRIPE_SECRET_KEY),
    webhookSecret: () =>
      required("STRIPE_WEBHOOK_SECRET", process.env.STRIPE_WEBHOOK_SECRET),
    priceId: () => required("STRIPE_PRICE_ID", process.env.STRIPE_PRICE_ID),
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
  },
} as const;
