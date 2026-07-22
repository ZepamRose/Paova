import { type EmailOtpType } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import type { Database } from "@/types/database.types";

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

  let next = searchParams.get("next") ?? "/dashboard";
  if (!next.startsWith("/")) {
    next = "/dashboard";
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocal = process.env.NODE_ENV === "development";
  const baseUrl =
    !isLocal && forwardedHost ? `https://${forwardedHost}` : origin;

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
    console.error("[auth/callback] exchangeCodeForSession:", error.message);
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
    console.error("[auth/callback] verifyOtp:", error.message);
  }

  return NextResponse.redirect(errorUrl);
}
