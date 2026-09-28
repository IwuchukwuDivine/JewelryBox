import type { Json } from "~~/supabase/database.types";
import type { AdminSettingsRepository } from "~/utils/types/api";
import { getSupabase } from "~/utils/supabase";
import mapError from "~/utils/api/mapError";

/**
 * Key/value site settings.
 *
 * `site_settings` is NOT publicly readable: the policy is
 * `is_public or is_admin()`, because the bank account lives in this table and
 * `PAYMENT_METHODS.bank_transfer.description` promises the details only after
 * an order. Checkout reads them through the order-scoped
 * `get_payment_instructions()` RPC instead, so a missing key here reads as
 * `null` for a signed-out caller rather than as an error.
 *
 * `set()` upserts only `key` and `value`, which leaves an existing row's
 * `is_public` flag alone — re-saving the bank account must not publish it.
 */
export const supabaseAdminSettingsRepo: AdminSettingsRepository = {
  async get<T = unknown>(key: string): Promise<T | null> {
    const { data, error } = await getSupabase()
      .from("site_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (error) throw mapError(error);
    if (!data) return null;
    // The contract's generic is the caller's assertion about what it stored;
    // jsonb carries no type of its own, so this is the one place a cast is
    // unavoidable rather than a shortcut.
    return data.value as T;
  },

  async set(key: string, value: unknown): Promise<void> {
    // `NonNullable<Json>`, not `Json`: the column is `jsonb not null` and
    // supabase-js serialises a JS `null` as SQL NULL rather than the JSON
    // scalar `null`, so storing one would trip 23502 — an opaque constraint
    // error rather than anything a caller could act on.
    const { error } = await getSupabase()
      .from("site_settings")
      .upsert({ key, value: value as NonNullable<Json> }, { onConflict: "key" });
    if (error) throw mapError(error);
  },
};
