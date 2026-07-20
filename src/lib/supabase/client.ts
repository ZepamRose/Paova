import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";
import type { Database } from "@/types/database.types";

/** Supabase client for use in Client Components (browser). */
export function createClient() {
  return createBrowserClient<Database>(env.supabase.url(), env.supabase.anonKey());
}
