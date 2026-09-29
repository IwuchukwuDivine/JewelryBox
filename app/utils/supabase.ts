import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~~/supabase/database.types";

/**
 * The one Supabase client, typed against the generated schema.
 *
 * Cached at module scope so every repository in `app/utils/api/` shares a
 * single instance. On the client that instance is the one the auth layer holds
 * the session on, so data queries carry the user's JWT and RLS sees the signed
 * in user. On the server it is a stateless anon client reused across requests —
 * persisting or refreshing a session there would leak one request's user into
 * the next.
 *
 * `useRuntimeConfig()` is read lazily rather than at import time: a util module
 * is evaluated before the Nuxt context exists, and reading it eagerly throws.
 */
let client: SupabaseClient<Database> | null = null;

export const getSupabase = (): SupabaseClient<Database> => {
  if (client) return client;

  const config = useRuntimeConfig();
  const url = config.public.supabaseUrl;
  const key = config.public.supabaseAnonKey;
  if (!url || !key) {
    throw new Error(
      "[supabase] SUPABASE_URL / SUPABASE_ANON_KEY are not configured.",
    );
  }

  client = createClient<Database>(url, key, {
    auth: import.meta.server
      ? {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        }
      : {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
  });
  return client;
};
