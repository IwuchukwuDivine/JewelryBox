import type { MaybeRefOrGetter } from "vue";
import { SITE_NAME } from "~/utils/constants/brand";

/** The four OG card templates in app/components/OgImage/. */
export type OgCard = "Default" | "Collection" | "Product" | "Campaign";

export interface PageSeoOptions {
  /** Page title without the brand — `pageTitle()` adds it and caps at 60. */
  title: MaybeRefOrGetter<string>;
  description: MaybeRefOrGetter<string>;
  /** Canonical path, e.g. "/watches" or "/product/meridian-40". */
  path: MaybeRefOrGetter<string>;
  ogType?: "website" | "article" | "product";
  /** Pass the exact title through untouched, brand suffix and all. */
  exactTitle?: boolean;
  /** Which share card to render, and its props. `false` keeps the static one. */
  ogImage?: { card: OgCard; props?: Record<string, unknown> } | false;
  /** e.g. "noindex, follow" for filtered listings and account pages. */
  robots?: MaybeRefOrGetter<string>;
  /** One JSON-LD object, or several. */
  jsonLd?: MaybeRefOrGetter<object | object[] | null | undefined>;
}

/**
 * The whole per-page SEO contract in one call: title, meta, share card,
 * canonical and JSON-LD.
 *
 * `useHead` is given a function so canonical and JSON-LD stay correct on
 * pages whose data arrives from `useAsyncData` — passing a plain object
 * there freezes the values at setup and silently ships stale canonicals.
 */
export default (options: PageSeoOptions) => {
  const {
    ogType = "website",
    exactTitle = false,
    ogImage = { card: "Default" },
    robots,
    jsonLd,
  } = options;

  const resolvedTitle = () => {
    const raw = toValue(options.title);
    return exactTitle ? raw : pageTitle(raw, SITE_NAME);
  };
  const resolvedDescription = () => seoDescription(toValue(options.description));
  const canonical = () => getAbsoluteUrl(toValue(options.path));

  // The global template already appends the brand; opt out so the title
  // built above is not suffixed twice.
  useHead({ titleTemplate: "%s" });

  useSeoMeta({
    title: resolvedTitle,
    description: resolvedDescription,
    ogTitle: resolvedTitle,
    ogDescription: resolvedDescription,
    ogUrl: canonical,
    twitterCard: "summary_large_image",
    twitterTitle: resolvedTitle,
    twitterDescription: resolvedDescription,
    ...(robots ? { robots: () => toValue(robots) } : {}),
  });

  if (ogImage) {
    defineOgImage(ogImage.card, ogImage.props ?? {});
  }

  useHead(() => {
    const graph = toValue(jsonLd);
    const nodes = graph ? (Array.isArray(graph) ? graph : [graph]) : [];

    return {
      // og:type is set here rather than through useSeoMeta because
      // "product" is a real Open Graph type that unhead's union omits.
      // unhead dedupes meta by `property`, so this overrides app.head.
      meta: [{ property: "og:type", content: ogType }],
      link: [{ rel: "canonical", href: canonical() }],
      script: nodes.map((node, i) => ({
        key: `ld-${i}`,
        type: "application/ld+json",
        innerHTML: JSON.stringify(node),
      })),
    };
  });
};
