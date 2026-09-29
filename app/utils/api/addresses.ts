import type { AddressRepository } from "~/utils/types/api";
import type { Address } from "~/utils/types/shop";
import { getSupabase } from "~/utils/supabase";
import mapError from "~/utils/api/mapError";
import currentUserId from "~/utils/api/currentUserId";
import {
  ADDRESS_SELECT,
  rowToAddress,
  type SavedAddress,
} from "~/utils/api/rows";

/**
 * Saved delivery addresses on the account.
 *
 * `Own addresses` scopes every statement to the caller, and
 * `unique index … on addresses (user_id) where is_default` is what actually
 * guarantees one default — `setDefault()` clears the others first because that
 * index would otherwise reject the second write.
 */

/** Only the keys supplied, so a partial update cannot null a stored field. */
const addressPatch = (address: Partial<Address>) => ({
  ...(address.full_name !== undefined ? { full_name: address.full_name } : {}),
  ...(address.email !== undefined ? { email: address.email } : {}),
  ...(address.phone !== undefined ? { phone: address.phone } : {}),
  ...(address.line1 !== undefined ? { line1: address.line1 } : {}),
  ...(address.line2 !== undefined ? { line2: address.line2 ?? null } : {}),
  ...(address.city !== undefined ? { city: address.city } : {}),
  ...(address.state !== undefined ? { state: address.state } : {}),
  ...(address.area !== undefined ? { area: address.area ?? null } : {}),
  ...(address.country !== undefined ? { country: address.country } : {}),
  ...(address.notes !== undefined ? { notes: address.notes ?? null } : {}),
});

export const supabaseAddressRepo: AddressRepository = {
  async list(): Promise<SavedAddress[]> {
    const { data, error } = await getSupabase()
      .from("addresses")
      .select(ADDRESS_SELECT)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: true });
    if (error) throw mapError(error);
    return (data ?? []).map(rowToAddress);
  },

  async add(address: Address): Promise<SavedAddress> {
    const userId = await currentUserId();
    if (!userId) throw new Error("You need to be signed in to save an address.");

    // The first address saved becomes the default, matching the mock. Counted
    // with a head request so no rows come back just to be measured.
    const { count, error: countError } = await getSupabase()
      .from("addresses")
      .select("id", { count: "exact", head: true });
    if (countError) throw mapError(countError);

    const { data, error } = await getSupabase()
      .from("addresses")
      .insert({
        user_id: userId,
        full_name: address.full_name,
        email: address.email,
        phone: address.phone,
        line1: address.line1,
        line2: address.line2 ?? null,
        city: address.city,
        state: address.state,
        area: address.area ?? null,
        country: address.country,
        notes: address.notes ?? null,
        is_default: (count ?? 0) === 0,
      })
      .select(ADDRESS_SELECT)
      .single();
    if (error) throw mapError(error);
    return rowToAddress(data);
  },

  async update(id: string, address: Partial<Address>): Promise<void> {
    const patch = addressPatch(address);
    if (!Object.keys(patch).length) return;
    const { error } = await getSupabase()
      .from("addresses")
      .update(patch)
      .eq("id", id);
    if (error) throw mapError(error);
  },

  async remove(id: string): Promise<void> {
    const { error } = await getSupabase().from("addresses").delete().eq("id", id);
    if (error) throw mapError(error);
  },

  /**
   * Two statements, in this order. The partial unique index permits exactly one
   * `is_default` row per user, so promoting before demoting is a constraint
   * violation rather than a swap.
   */
  async setDefault(id: string): Promise<void> {
    const sb = getSupabase();
    const userId = await currentUserId();
    if (!userId) throw new Error("You are not signed in.");

    const cleared = await sb
      .from("addresses")
      .update({ is_default: false })
      .eq("user_id", userId)
      .eq("is_default", true)
      .neq("id", id);
    if (cleared.error) throw mapError(cleared.error);

    const { error } = await sb
      .from("addresses")
      .update({ is_default: true })
      .eq("id", id);
    if (error) throw mapError(error);
  },
};
