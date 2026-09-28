export const formatPrice = (price: number): string => {
  if (price === 0) return "";
  return `₦${price.toLocaleString("en-NG")}`;
};

export const formatPriceWithUnit = (
  price: number,
  unit?: string | null,
): string => {
  const base = formatPrice(price);
  if (!base || !unit) return base;
  return `${base}/${unit}`;
};
