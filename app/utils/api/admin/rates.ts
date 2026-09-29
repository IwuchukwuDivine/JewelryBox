import type { AdminRatesRepository } from "~/utils/types/api";
import type { DeliveryRate, RateInput } from "~/utils/types/shop";
import { getSupabase } from "~/utils/supabase";
import mapError from "~/utils/api/mapError";
import { RATE_SELECT, rowToRate } from "~/utils/api/rows";

/**
 * The delivery pricing table — one row per Lagos area she dispatches to, one
 * per state she flies to.
 *
 * `list()` returns inactive rows too: the public `options()` filters on
 * `active`, but the admin screen is where that toggle lives. Deactivating is
 * the intended way to stop quoting a destination — there is deliberately no
 * partial unique index on `active`, so a second row for the same destination is
 * rejected rather than making `resolve()` ambiguous.
 */

const ratePayload = (input: Partial<RateInput>) => ({
  ...(input.mode !== undefined ? { mode: input.mode } : {}),
  ...(input.name !== undefined ? { name: input.name } : {}),
  ...(input.state !== undefined ? { state: input.state } : {}),
  ...(input.fee_ngn !== undefined ? { fee_ngn: input.fee_ngn } : {}),
  ...(input.active !== undefined ? { active: input.active } : {}),
  ...(input.position !== undefined ? { position: input.position } : {}),
});

export const supabaseAdminRatesRepo: AdminRatesRepository = {
  async list(): Promise<DeliveryRate[]> {
    const { data, error } = await getSupabase()
      .from("delivery_rates")
      .select(RATE_SELECT)
      .order("mode", { ascending: true })
      .order("position", { ascending: true })
      .order("name", { ascending: true })
      .order("id", { ascending: true });
    if (error) throw mapError(error);
    return (data ?? []).map(rowToRate);
  },

  async create(input: RateInput): Promise<DeliveryRate> {
    const { data, error } = await getSupabase()
      .from("delivery_rates")
      .insert({
        mode: input.mode,
        name: input.name,
        state: input.state,
        fee_ngn: input.fee_ngn,
        active: input.active,
        position: input.position,
      })
      .select(RATE_SELECT)
      .single();
    if (error) throw mapError(error);
    return rowToRate(data);
  },

  async update(id: string, input: Partial<RateInput>): Promise<DeliveryRate> {
    const { data, error } = await getSupabase()
      .from("delivery_rates")
      .update(ratePayload(input))
      .eq("id", id)
      .select(RATE_SELECT)
      .single();
    if (error) throw mapError(error);
    return rowToRate(data);
  },

  async remove(id: string): Promise<void> {
    const { error } = await getSupabase()
      .from("delivery_rates")
      .delete()
      .eq("id", id);
    if (error) throw mapError(error);
  },

  /**
   * A courier price rise applied across the table. One statement per row rather
   * than an upsert, because an upsert would have to carry `mode`, `name` and
   * `state` for every row — three columns this call has no business rewriting,
   * and a stale copy of any of them would silently move a destination.
   *
   * Issued together and settled together, so one bad id reports itself rather
   * than aborting the rest halfway through.
   */
  async updateFees(fees: { id: string; fee_ngn: number }[]): Promise<void> {
    if (!fees.length) return;
    const sb = getSupabase();
    const results = await Promise.all(
      fees.map(({ id, fee_ngn }) =>
        sb.from("delivery_rates").update({ fee_ngn }).eq("id", id),
      ),
    );
    const failed = results.find((result) => result.error);
    if (failed?.error) throw mapError(failed.error);
  },
};
