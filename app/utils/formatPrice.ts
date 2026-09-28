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
 */
export const formatDeliveryFee = (fee: number): string =>
  fee === 0 ? "Free" : formatPrice(fee);

/** e.g. `₦1,850,000/piece`. */
export const formatPriceWithUnit = (
  price: number,
  unit?: string | null,
): string => {
  const base = formatPrice(price);
  return unit ? `${base}/${unit}` : base;
};
