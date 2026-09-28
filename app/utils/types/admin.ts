import type {
  ProductCategory,
  ProductTag,
  SpecPair,
} from "~/utils/types/shop";

/**
 * Draft shapes for the admin forms.
 *
 * Numeric fields stay `string | number` while being edited, because inputs
 * emit strings. Pages coerce them when building the repository payloads
 * (`ProductInput`, `VariantInput`, `ZoneInput` in `types/shop.ts`).
 */

export interface ProductDraft {
  id?: string;
  slug: string;
  name: string;
  brand: string;
  description: string;
  category: ProductCategory | "";
  price_ngn: string | number;
  compare_at_ngn: string | number | null;
  images: string[];
  specs: SpecPair[];
  tags: ProductTag[];
  in_stock: boolean;
  stock_count: string | number | null;
  made_to_order: boolean;
  featured: boolean;
}

export interface VariantDraft {
  id?: string;
  label: string;
  options: Record<string, string>;
  price_ngn: string | number;
  in_stock: boolean;
  position: string | number;
}

export interface ZoneDraft {
  id?: string;
  name: string;
  states: string[];
  fee_ngn: string | number;
  active: boolean;
  position: string | number;
}

/** Tiles on the admin dashboard. */
export interface AdminStats {
  orders_total: number;
  orders_awaiting_payment: number;
  orders_to_ship: number;
  revenue_ngn: number;
  products_total: number;
  products_out_of_stock: number;
}

export interface RevenuePoint {
  /** ISO date, day granularity. */
  date: string;
  revenue_ngn: number;
  orders: number;
}

export interface TopProduct {
  product_id: string;
  name: string;
  units: number;
  revenue_ngn: number;
}

export interface AdminAnalytics {
  revenue: RevenuePoint[];
  /** Order counts keyed by status, for the doughnut. */
  status_breakdown: Record<string, number>;
  top_products: TopProduct[];
}
