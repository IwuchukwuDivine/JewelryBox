import type { SitemapUrlInput } from "#sitemap/types";
import { COLLECTIONS, PRODUCT_CATEGORIES } from "~~/app/utils/constants/catalog";

/**
 * Sitemap source.
 *
 * Runtime rather than build-time because the catalogue lives in Supabase and
 * changes without a redeploy. Three layers, in descending order of how much can
 * go wrong:
 *
 *   1. Static marketing routes — literals here.
 *   2. Taxonomy routes — derived from `PRODUCT_CATEGORIES` and `COLLECTIONS`,
 *      the same constants `pages/[category].vue` resolves against, so a new
 *      collection appears in the sitemap the moment it appears in the nav and
 *      neither list can drift from the router.
 *   3. Products — one query, `archived_at is null`.
 *
 * ── A sitemap must never 500 ──────────────────────────────────────────────
 * If Supabase is unreachable or the query errors, layers 1 and 2 are still
 * returned and the error is logged. A 500 here costs the whole file: Search
 * Console reports the fetch as failed and keeps the last good copy only until it
 * expires. Half a sitemap is strictly better than none, and the next
 * revalidation repairs it.
 *
 * ── Caching ───────────────────────────────────────────────────────────────
 * `defineCachedEventHandler` with `swr`, so a crawler hit is served from the
 * cache and one request per hour pays for the query. The handler is still
 * declared with `defineSitemapEventHandler` inside the cache wrapper, which is
 * what keeps `@nuxtjs/sitemap`'s `SitemapUrlInput[]` return contract enforced
 * by the compiler — the module's own helper is `defineEventHandler` with that
 * return type and nothing else, so wrapping it is safe.
 *
 * Private routes (/account, /checkout, /wishlist, /search) are excluded in
 * nuxt.config.ts `sitemap.exclude` and disallowed in public/robots.txt.
 */

/** One hour fresh, then served stale while a single request revalidates. */
const CACHE_MAX_AGE = 60 * 60;

/**
 * `config.toml` sets PostgREST `max_rows = 1000`, which TRUNCATES SILENTLY —
 * a plain `select slug` over 1,001 products returns 1,000 rows with no error and
 * no header a client checks, and the sitemap quietly loses every page past the
 * first thousand. So the query is paged with `.range()` until a short page
 * arrives. The page size matches the server cap: asking for more than 1,000 is
 * pointless, asking for fewer just costs extra round-trips.
 */
const PAGE_SIZE = 1_000;

/** 50,000 URLs is the sitemap spec's own per-file ceiling. */
const MAX_PAGES = 50;

const staticUrls: SitemapUrlInput[] = [
  { loc: "/", priority: 1.0, changefreq: "weekly" },
  { loc: "/about", priority: 0.6, changefreq: "monthly" },
  { loc: "/contact", priority: 0.5, changefreq: "monthly" },
  { loc: "/faq", priority: 0.5, changefreq: "monthly" },
];

/**
 * The five categories and the four collections, as `/<slug>` — the shape
 * `pages/[category].vue` matches. `watches` is deliberately in both lists (the
 * collection wins in the page's ordered lookup), so the slugs are deduplicated
 * here rather than emitted twice: a duplicate `<loc>` is a validation warning in
 * Search Console.
 */
const taxonomyUrls = (): SitemapUrlInput[] => {
  const slugs = new Set<string>([
    ...PRODUCT_CATEGORIES.map((category) => category.slug),
    ...COLLECTIONS.map((collection) => collection.slug),
  ]);
  return [...slugs].map((slug) => ({
    loc: `/${slug}`,
    priority: 0.7,
    changefreq: "weekly" as const,
  }));
};

/**
 * Every live product as `/product/<slug>`, `lastmod` from `updated_at` so a
 * re-priced or re-photographed piece gets re-crawled.
 *
 * Throws on a query error rather than returning a partial list, so the caller's
 * one catch decides what a failure means. The anon client is correct: the public
 * read policy already hides archived rows, and the explicit `archived_at is
 * null` filter is the belt to that braces — `allSlugs()` in the repository lane
 * filters the same way, and an archived slug must never reach a crawler.
 */
const productUrls = async (): Promise<SitemapUrlInput[]> => {
  const supabase = serverSupabase();
  const urls: SitemapUrlInput[] = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE_SIZE;
    const { data, error } = await supabase
      .from("products")
      .select("slug, updated_at")
      .is("archived_at", null)
      // A stable order is what makes paging correct: without one, PostgREST is
      // free to return rows in a different order per request and a page can
      // both repeat and skip. `id` is the primary key, so it is unique and
      // never tied.
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);
    if (!data?.length) break;

    for (const product of data) {
      urls.push({
        loc: `/product/${product.slug}`,
        lastmod: product.updated_at,
        priority: 0.8,
        changefreq: "weekly",
      });
    }

    // A short page is the last page.
    if (data.length < PAGE_SIZE) break;
  }

  return urls;
};

export default defineCachedEventHandler(
  defineSitemapEventHandler(async (): Promise<SitemapUrlInput[]> => {
    const base = [...staticUrls, ...taxonomyUrls()];

    try {
      return [...base, ...(await productUrls())];
    } catch (err) {
      console.error(
        "[sitemap] product URLs unavailable, serving static routes only:",
        err instanceof Error ? err.message : err,
      );
      return base;
    }
  }),
  {
    name: "sitemap-urls",
    // One entry: the source takes no parameters, so a per-request key would
    // fragment the cache over query strings that change nothing.
    getKey: () => "urls",
    maxAge: CACHE_MAX_AGE,
    swr: true,
  },
);
