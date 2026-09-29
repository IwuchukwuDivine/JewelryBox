import type { DeliveryRepository } from "~/utils/types/api";
import type { DeliveryOptions, DeliverySelection } from "~/utils/types/shop";
import { getSupabase } from "~/utils/supabase";
import mapError from "~/utils/api/mapError";
import { RATE_SELECT, rowToRate } from "~/utils/api/rows";

/**
 * Escapes the LIKE metacharacters so `ilike` stays an exact, case-insensitive
 * comparison. Deliberately NOT `sanitizeSearch()`: that strips parentheses to
 * protect `or=()` syntax, which would turn the state `FCT (Abuja)` into
 * `FCT Abuja` and stop it matching its own rate row.
 */
const likeLiteral = (value: string): string =>
  value.replace(/[\\%_]/g, (match) => `\\${match}`);

/**
 * Delivery pricing.
 *
 * `resolve()` is a deliberate mirror of `mockDeliveryRepo.resolve()`, down to
 * the case-insensitive name match, because `place_order()` re-resolves the same
 * way server-side and the three must agree or a quote and a charge disagree.
 *
 * A destination with no active row returns **null, not an error**. That is a
 * valid order — the fee is quoted afterwards by email — and treating it as a
 * failure is what would break the Zamfara/Bayelsa path the fixtures exist to
 * exercise.
 */
export const supabaseDeliveryRepo: DeliveryRepository = {
  async options(): Promise<DeliveryOptions> {
    const { data, error } = await getSupabase()
      .from("delivery_rates")
      .select(RATE_SELECT)
      .eq("active", true)
      .order("position", { ascending: true })
      .order("name", { ascending: true })
      .order("id", { ascending: true });
    if (error) throw mapError(error);

    const rates = (data ?? []).map(rowToRate);
    return {
      areas: rates.filter((rate) => rate.mode === "dispatch"),
      states: rates.filter((rate) => rate.mode === "flight"),
    };
  },

  async resolve(input: {
    state: string;
    area?: string;
  }): Promise<DeliverySelection | null> {
    // Derived from the state, never chosen: Lagos goes by dispatch rider and is
    // priced per area, everywhere else flies and is priced per state.
    const method = deliveryMethodForState(input.state);
    const destination = (
      method === "dispatch" ? (input.area ?? "") : input.state
    ).trim();
    if (!destination) return null;

    // `ilike` with no wildcards is a case-insensitive equality, which is what
    // the `unique (mode, lower(name))` index and the mock's
    // `name.toLowerCase()` comparison both mean. The escape matters: a `%` or
    // `_` in the name would otherwise turn an exact match into a pattern.
    const { data, error } = await getSupabase()
      .from("delivery_rates")
      .select(RATE_SELECT)
      .eq("mode", method)
      .eq("active", true)
      .ilike("name", likeLiteral(destination))
      .maybeSingle();
    if (error) throw mapError(error);
    if (!data) return null;

    const rate = rowToRate(data);
    return {
      method,
      rate_id: rate.id,
      // Her casing, not the customer's — this is what lands on the order.
      label: rate.name,
      fee_ngn: rate.fee_ngn,
    };
  },
};
