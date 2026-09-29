import { LOW_STOCK_THRESHOLD } from "~/utils/constants/catalog";
import type { Availability, Product, ProductVariant } from "~/utils/types/shop";

/**
 * Resolve what the customer is told about stock.
 *
 * Order matters: a made-to-order piece is never "sold", and a low-stock count
 * only shows when the vendor set one. Product cards, the PDP, the OG Product
 * card and the admin table all read this — never re-derive it inline, or the
 * four will drift.
 *
 * Pass a variant to resolve for the selected option rather than the product.
 */
export default (product: Product, variant?: ProductVariant): Availability => {
  const inStock = variant ? variant.in_stock : product.in_stock;

  if (product.made_to_order) return "made-to-order";
  if (!inStock) return "sold";

  // Scarcity is a product-level signal; variants do not carry their own count.
  if (!variant && product.stock_count !== null && product.stock_count <= LOW_STOCK_THRESHOLD) {
    return "low-stock";
  }

  return "in-stock";
};
