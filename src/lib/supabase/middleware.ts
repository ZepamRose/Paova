import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import type { Database } from "@/types/database.types";

/**
 * Refreshes the Supabase auth session on every request and forwards the
 * updated cookies. Called from the root middleware.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Local bootstrap convenience: before .env.local exists, skip the refresh so
  // the app still boots. In production the same silence is a trap — a missing
  // variable would surface as users being logged out at random rather than as
  // a deployment error, so fail loudly there instead.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    if (
      process.env.NODE_ENV === "production" ||
      process.env.VERCEL_ENV === "production"
    ) {
      throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY: auth sessions cannot be refreshed.",
      );
    }
    return response;
  }

  const supabase = createServerClient<Database>(
    env.supabase.url(),
    env.supabase.anonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Touch the user to trigger a token refresh when needed.
  await supabase.auth.getUser();

  return response;
}
