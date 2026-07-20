import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import type { Database } from "@/types/database.types";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * Uses the request cookies to persist the user session.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(env.supabase.url(), env.supabase.anonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — safe to ignore when middleware
          // is responsible for refreshing sessions.
        }
      },
    },
  });
}

/**
 * Privileged client using the service role key. Server-only.
 * Use for trusted operations that must bypass RLS (e.g. inserting a public
 * waiver submission). Never import this into client code.
 */
export function createServiceRoleClient() {
  return createServerClient<Database>(env.supabase.url(), env.supabase.serviceRoleKey(), {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {
        // no-op: service role client is stateless
      },
    },
  });
}
