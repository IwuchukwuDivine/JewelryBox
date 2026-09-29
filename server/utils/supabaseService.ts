import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~~/supabase/database.types";

/**
 * Service-role Supabase client — **bypasses every RLS policy**.
 *
 * Reserved for the two things a browser session legitimately cannot do:
 *
 *   · record that an order email was sent (`order_emails`), which is the
 *     idempotency guard against a replayed notify request;
 *   · spend the rate-limit budget (`check_rate_limit`), whose execute grant is
 *     revoked from `anon` and `authenticated` precisely so a client cannot
 *     exhaust it.
 *
 * It must never be used to satisfy a read the anon client could do, and the key
 * must never appear under `runtimeConfig.public`. Every call site should be
 * obvious about why it needs to be here.
 */
let client: SupabaseClient<Database> | null = null;

export const serviceSupabase = (): SupabaseClient<Database> => {
  if (client) return client;

  const config = useRuntimeConfig();
  if (!config.supabaseUrl || !config.supabaseServiceKey) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set");
  }

  client = createClient<Database>(config.supabaseUrl, config.supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return client;
};
