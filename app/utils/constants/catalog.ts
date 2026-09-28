import type {
  ProductCategory,
  ProductFilter,
  ProductSort,
  ProductTag,
} from "~/utils/types/shop";

/**
 * The canonical catalog dimensions. Drives category pages, nav links, filter
 * chips, breadcrumbs and JSON-LD.
 *
 * Two levels, because the prototype's navigation and its product categories
 * are not the same thing: the header offers four *collections*
 * (Watches · Jewelry · Moissanite · Gifts), while a product belongs to exactly
 * one *category* (watches, rings, necklaces, earrings, bracelets). Jewelry is
 * four categories; Moissanite and Gifts are tag-driven and cut across all of
 * them.
 */

export interface CategoryDefinition {
  value: ProductCategory;
  /** Singular, for breadcrumbs and chips. */
  label: string;
  /** Plural, for page titles. */
  plural: string;
  slug: string;
  /** Meta description and the collection OG card. Keep under 155 chars. */
  description: string;
  /** Editorial line for the category hero, set in Marcellus. */
  headline: string;
  heroImage: string;
}

export const PRODUCT_CATEGORIES: readonly CategoryDefinition[] = [
  {
    value: "watches",
    label: "Watch",
    plural: "Watches",
    slug: "watches",
    description:
      "Automatic and quartz wristwatches, certified and insured in transit. Delivered across Nigeria in 1–3 working days.",
    headline: "Chosen for the wrist.",
    heroImage: "/images/categories/watches.jpg",
  },
  {
    value: "rings",
    label: "Ring",
    plural: "Rings",
    slug: "rings",
    description:
      "Engagement rings, bands and moissanite solitaires in 14k gold. Sized to order, certified, insured in transit.",
    headline: "Worn every day, for good.",
    heroImage: "/images/categories/rings.jpg",
  },
  {
    value: "necklaces",
    label: "Necklace",
    plural: "Necklaces",
    slug: "necklaces",
    description:
      "Pendants, tennis chains and everyday necklaces in gold and moissanite. Certified and insured in transit.",
    headline: "Close to the skin.",
    heroImage: "/images/categories/necklaces.jpg",
  },
  {
    value: "earrings",
    label: "Earring",
    plural: "Earrings",
    slug: "earrings",
    description:
      "Studs, hoops and drops in 14k gold and moissanite. Certified, insured, delivered across Nigeria.",
    headline: "The quietest statement.",
    heroImage: "/images/categories/earrings.jpg",
  },
  {
    value: "bracelets",
    label: "Bracelet",
    plural: "Bracelets",
    slug: "bracelets",
    description:
      "Tennis bracelets, cuffs and bangles in gold and moissanite. Certified and insured in transit.",
    headline: "Weight you notice.",
    heroImage: "/images/categories/bracelets.jpg",
  },
] as const;

export interface CollectionDefinition {
  slug: string;
  label: string;
  description: string;
  headline: string;
  /** Categories this collection draws from. Empty means all. */
  categories: ProductCategory[];
  /** Additional tag every piece must carry. */
  tag?: ProductTag;
}

/** The four header entries. */
export const COLLECTIONS: readonly CollectionDefinition[] = [
  {
    slug: "watches",
    label: "Watches",
    headline: "Chosen for the wrist.",
    description:
      "Automatic and quartz wristwatches, certified and insured in transit.",
    categories: ["watches"],
  },
  {
    slug: "jewelry",
    label: "Jewelry",
    headline: "Built for people who keep what they buy.",
    description:
      "Rings, necklaces, earrings and bracelets in 14k gold and moissanite.",
    categories: ["rings", "necklaces", "earrings", "bracelets"],
  },
  {
    slug: "moissanite",
    label: "Moissanite",
    headline: "More fire than diamond. Chosen on purpose.",
    description:
      "Moissanite graded on the same colour scale as diamond, with more brilliance and more fire.",
    categories: [],
    tag: "moissanite",
  },
  {
    slug: "gifts",
    label: "Gifts",
    headline: "Keep the pieces you love close.",
    description:
      "Pieces chosen to be given — boxed, sealed and certified, delivered across Nigeria.",
    categories: [],
    tag: "gift",
  },
] as const;

export const SORT_OPTIONS: readonly { label: string; value: ProductSort }[] = [
  { label: "Newest", value: "newest" },
  { label: "Price: low to high", value: "price-asc" },
  { label: "Price: high to low", value: "price-desc" },
  { label: "Name: A–Z", value: "name-asc" },
] as const;

/** Quick-filter chips on category pages, in display order. */
export const FILTER_OPTIONS: readonly { label: string; value: ProductFilter }[] = [
  { label: "All", value: "all" },
  { label: "New in", value: "new" },
  { label: "Moissanite", value: "moissanite" },
  { label: "In stock", value: "in-stock" },
  { label: "Under ₦500k", value: "under" },
] as const;

/** Threshold behind the `under` filter chip. */
export const UNDER_PRICE_NGN = 500_000;

/** At or below this remaining count, a piece shows "N left" instead of "In stock". */
export const LOW_STOCK_THRESHOLD = 3;

/** How many pieces a category page shows before paginating. */
export const PRODUCTS_PER_PAGE = 12;

export const categoryBySlug = (slug: string): CategoryDefinition | undefined =>
  PRODUCT_CATEGORIES.find((c) => c.slug === slug);

export const categoryByValue = (
  value: ProductCategory,
): CategoryDefinition | undefined =>
  PRODUCT_CATEGORIES.find((c) => c.value === value);

export const collectionBySlug = (
  slug: string,
): CollectionDefinition | undefined => COLLECTIONS.find((c) => c.slug === slug);
