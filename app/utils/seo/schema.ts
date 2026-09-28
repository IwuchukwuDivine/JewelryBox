import {
  SITE_NAME,
  SITE_DESCRIPTION,
  SOCIAL_X,
  SOCIAL_INSTAGRAM,
  DEFAULT_OG_IMAGE,
  LOCKUP_DARK,
  CURRENCY,
} from "~/utils/constants/brand";

/**
 * JSON-LD builders.
 *
 * Written by hand rather than through nuxt-schema-org: the reference
 * implementation this project follows (HerStory Africa) does the same and
 * ranks well, and hand-written graphs are far easier to keep exact.
 *
 * Every builder returns a plain object to be JSON.stringify'd into a
 * `<script type="application/ld+json">` — see usePageSeo.
 */

/** Stable @id anchors so nodes can reference each other across pages. */
export const ORGANIZATION_ID = () => getAbsoluteUrl("/#organization");
export const WEBSITE_ID = () => getAbsoluteUrl("/#website");

export function organizationSchema() {
  const sameAs = [SOCIAL_X, SOCIAL_INSTAGRAM].filter(Boolean);
  return {
    "@type": "Organization",
    "@id": ORGANIZATION_ID(),
    name: SITE_NAME,
    url: getAbsoluteUrl("/"),
    logo: getAbsoluteUrl(LOCKUP_DARK),
    image: getAbsoluteUrl(DEFAULT_OG_IMAGE),
    description: SITE_DESCRIPTION,
    ...(sameAs.length ? { sameAs } : {}),
  };
}

export function websiteSchema() {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID(),
    name: SITE_NAME,
    url: getAbsoluteUrl("/"),
    description: SITE_DESCRIPTION,
    publisher: { "@id": ORGANIZATION_ID() },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: getAbsoluteUrl("/search?q={search_term_string}"),
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/** The Organization + WebSite graph. Homepage only — it is site-wide data. */
export function siteGraph() {
  return {
    "@context": "https://schema.org",
    "@graph": [organizationSchema(), websiteSchema()],
  };
}

export interface Crumb {
  name: string;
  path: string;
}

/**
 * Breadcrumb trail. Pass the ancestors only — "Home" is prepended here and
 * the current page should be the last entry.
 */
export function breadcrumbSchema(crumbs: Crumb[]) {
  const trail = [{ name: "Home", path: "/" }, ...crumbs];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: getAbsoluteUrl(c.path),
    })),
  };
}

export interface ProductSchemaInput {
  name: string;
  description: string;
  /** Absolute or root-relative; normalised here. */
  images: string[];
  /** Canonical path, e.g. `/product/meridian-automatic-40`. */
  path: string;
  price: number;
  inStock: boolean;
  sku?: string;
  brand?: string;
  category?: string;
  /** ISO date the offer is valid until, if the piece is a limited run. */
  priceValidUntil?: string;
}

export function productSchema(p: ProductSchemaInput) {
  const url = getAbsoluteUrl(p.path);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    image: p.images.map((i) => getAbsoluteUrl(i)),
    url,
    mainEntityOfPage: url,
    ...(p.sku ? { sku: p.sku } : {}),
    ...(p.category ? { category: p.category } : {}),
    brand: { "@type": "Brand", name: p.brand ?? SITE_NAME },
    offers: {
      "@type": "Offer",
      url,
      price: p.price.toFixed(2),
      priceCurrency: CURRENCY,
      availability: p.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@id": ORGANIZATION_ID() },
      ...(p.priceValidUntil ? { priceValidUntil: p.priceValidUntil } : {}),
    },
  };
}

export interface CollectionSchemaInput {
  name: string;
  description: string;
  path: string;
  items: { name: string; path: string }[];
}

export function collectionSchema(c: CollectionSchemaInput) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: c.name,
    description: c.description,
    url: getAbsoluteUrl(c.path),
    isPartOf: { "@id": WEBSITE_ID() },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: c.items.length,
      itemListElement: c.items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: item.name,
        url: getAbsoluteUrl(item.path),
      })),
    },
  };
}

export interface FaqEntry {
  question: string;
  answer: string;
}

export function faqSchema(entries: FaqEntry[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entries.map((e) => ({
      "@type": "Question",
      name: e.question,
      acceptedAnswer: { "@type": "Answer", text: e.answer },
    })),
  };
}
