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

/** Normalize APP_URL so a pasted "=https://..." or trailing slash can't break links. */
function normalizeAppUrl(raw: string | undefined): string {
  let url = (raw ?? "http://localhost:3000").trim();
  // Common mistake: copying "=https://..." from a .env line.
  while (url.startsWith("=")) {
    url = url.slice(1).trim();
  }
  url = url.replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return url;
}

export const env = {
  appUrl: normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL),

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

  resend: {
    // Optional: emails are simply skipped when these are not configured.
    apiKey: process.env.RESEND_API_KEY ?? "",
    // Resend's free test sender works without a domain (delivers only to your
    // own Resend account email). Swap for your domain address at launch.
    from: process.env.RESEND_FROM ?? "Paova <onboarding@resend.dev>",
  },
} as const;
