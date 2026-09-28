import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~~/supabase/database.types";

/**
 * Server-side Supabase client — anon key, no session.
 *
 * Nitro routes reach the database through public policies and the
 * `security definer` RPCs (`lookup_order`, `place_order`), never through an
 * admin-gated write: those stay in the browser where the user's own session
 * carries their role into RLS. If a server route ever needs to write past a
 * policy, that is a deliberate decision and it uses `serviceSupabase()`.
 *
 * Module-cached because `useRuntimeConfig()` is only reachable inside an event
 * context, and a route's continuation after an `await` may not be.
 */
let client: SupabaseClient<Database> | null = null;

export const serverSupabase = (): SupabaseClient<Database> => {
  if (client) return client;

  const config = useRuntimeConfig();
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw new Error("SUPABASE_URL / SUPABASE_ANON_KEY are not set");
  }

  client = createClient<Database>(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return client;
};
