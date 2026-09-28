import type { WishlistRepository } from "~/utils/types/api";
import { getSupabase } from "~/utils/supabase";
import mapError from "~/utils/api/mapError";
import isUuid from "~/utils/api/isUuid";
import currentUserId from "~/utils/api/currentUserId";

/**
 * Owner-scoped by RLS — `Own wishlist` matches `user_id = auth.uid()` on both
 * halves, so every call below already operates on the caller's own rows. The
 * user id is fetched only because `wishlists.user_id` has no default.
 *
 * Signed out these are never called: `useWishlist` keeps the list in
 * localStorage and pushes it up through `merge()` on first sign-in.
 */
const requireUser = async (): Promise<string> => {
  const userId = await currentUserId();
  if (!userId) throw new Error("You need to be signed in to save pieces.");
  return userId;
};

export const supabaseWishlistRepo: WishlistRepository = {
  async list(): Promise<string[]> {
    const { data, error } = await getSupabase()
      .from("wishlists")
      .select("product_id")
      .order("created_at", { ascending: true })
      .order("product_id", { ascending: true });
    if (error) throw mapError(error);
    return (data ?? []).map((row) => row.product_id);
  },

  async add(productId: string): Promise<void> {
    if (!isUuid(productId)) return;
    const userId = await requireUser();
    // Idempotent: adding twice is a no-op rather than a 409 the UI has to know
    // how to read.
    const { error } = await getSupabase()
      .from("wishlists")
      .upsert(
        { user_id: userId, product_id: productId },
        { onConflict: "user_id,product_id", ignoreDuplicates: true },
      );
    if (error) throw mapError(error);
  },

  async remove(productId: string): Promise<void> {
    if (!isUuid(productId)) return;
    const userId = await requireUser();
    const { error } = await getSupabase()
      .from("wishlists")
      .delete()
      .match({ user_id: userId, product_id: productId });
    if (error) throw mapError(error);
  },

  async merge(productIds: string[]): Promise<string[]> {
    const userId = await requireUser();
    // Ids saved before Phase F are fixture ids (`prd_001`), not uuids. Sending
    // one is a 22P02 from PostgREST, so a stale local list would fail the whole
    // merge rather than contributing the ids that are still good.
    const rows = productIds
      .filter(isUuid)
      .map((product_id) => ({ user_id: userId, product_id }));

    if (rows.length) {
      const { error } = await getSupabase()
        .from("wishlists")
        .upsert(rows, {
          onConflict: "user_id,product_id",
          ignoreDuplicates: true,
        });
      if (error) throw mapError(error);
    }

    return supabaseWishlistRepo.list();
  },
};
