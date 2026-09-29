/**
 * Naira formatting.
 *
 * Always pair with `.price` (or `font-variant-numeric: tabular-nums`) so
 * columns of figures line up — the design system sets prices in IBM Plex Mono
 * with tabular figures for exactly this reason.
 *
 * Prices are stored as whole naira integers, never kobo and never floats.
 */
export const formatPrice = (price: number): string =>
  `₦${Math.round(price).toLocaleString("en-NG")}`;

/**
 * A delivery fee, where zero is a feature rather than a number to print.
 *
 * `null` is not an error and not an edge case: an order to a destination with
 * no active rate is placed with `delivery_fee_ngn = null`, and the fee follows
 * by email.
 *
 * The null wording is **caller-supplied, and the difference is tense rather
 * than style**. On checkout the customer has not ordered yet, so "Quoted after
 * you order" tells them what will happen; in an order email they already have,
 * the same words read as stale. The email says "To be confirmed", which in
 * turn is weaker than it should be on checkout. Neither is a house style to
 * standardise on, so the formatter refuses to pick — it owns the ₦ and "Free"
 * logic, which is the part that must not be duplicated, and nothing else.
 *
 * Overloaded rather than taking a required second argument, so the compiler
 * demands the phrase exactly where `null` is reachable and stays quiet where
 * the fee is known to be a number.
 */
export function formatDeliveryFee(fee: number): string;
export function formatDeliveryFee(fee: number | null, whenNull: string): string;
export function formatDeliveryFee(fee: number | null, whenNull?: string): string {
  // Unreachable through the overloads; the fallback only covers a cast, and
  // "To be confirmed" is the one wording that is never actively wrong.
  if (fee === null) return whenNull ?? "To be confirmed";
  return fee === 0 ? "Free" : formatPrice(fee);
}

/** e.g. `₦1,850,000/piece`. */
export const formatPriceWithUnit = (
  price: number,
  unit?: string | null,
): string => {
  const base = formatPrice(price);
  return unit ? `${base}/${unit}` : base;
};
