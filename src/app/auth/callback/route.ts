import { type EmailOtpType } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { safeNextPath } from "@/lib/auth/safe-next-path";
import type { Database } from "@/types/database.types";
import { logWarn } from "@/lib/observability/log";

/**
 * Exchanges the magic-link code (or token_hash) for a session cookie,
 * then redirects into the app.
 *
 * Cookies must be written onto the redirect response itself — otherwise
 * Next.js can drop the session and the user lands back on /login.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const next = safeNextPath(searchParams.get("next"));

  // Prefer the configured app URL in production so a forged x-forwarded-host
  // cannot send the post-login redirect (and cookies context) off-origin.
  const isLocal = process.env.NODE_ENV === "development";
  const baseUrl = isLocal ? origin : env.appUrl;

  const successUrl = `${baseUrl}${next}`;
  const errorUrl = `${baseUrl}/login?error=auth`;

  // Build the redirect up-front so Set-Cookie lands on the same response.
  let redirectResponse = NextResponse.redirect(successUrl);

  const supabase = createServerClient<Database>(
    env.supabase.url(),
    env.supabase.anonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            redirectResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return redirectResponse;
    }
    logWarn("auth.exchange_code_failed", { message: error.message });
  }

  if (tokenHash && type) {
    // Recreate so cookie writes from verifyOtp attach to a fresh redirect.
    redirectResponse = NextResponse.redirect(successUrl);
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      return redirectResponse;
    }
    logWarn("auth.verify_otp_failed", { message: error.message });
  }

  return NextResponse.redirect(errorUrl);
}
