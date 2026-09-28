import type { SitemapUrlInput } from "#sitemap/types";

/**
 * Sitemap source.
 *
 * Runtime rather than build-time because the catalogue lives in Supabase
 * and changes without a redeploy. Static marketing routes are listed here;
 * product and collection URLs join them once the schema lands — query them
 * and map to `{ loc, lastmod }`, letting `lastmod` come from the row's
 * `updated_at` so Google re-crawls changed pieces.
 *
 * Private routes (/account, /checkout, /wishlist) are excluded in
 * nuxt.config.ts `sitemap.exclude` and disallowed in public/robots.txt.
 */
export default defineSitemapEventHandler(async (): Promise<SitemapUrlInput[]> => {
  const staticUrls: SitemapUrlInput[] = [
    { loc: "/", priority: 1.0, changefreq: "weekly" },
    { loc: "/about", priority: 0.6, changefreq: "monthly" },
    { loc: "/contact", priority: 0.5, changefreq: "monthly" },
    { loc: "/faq", priority: 0.5, changefreq: "monthly" },
  ];

  // TODO(catalogue): append collections and products from Supabase, e.g.
  //   const { data } = await serverSupabase().from("products")
  //     .select("slug, updated_at").eq("published", true);
  //   return [...staticUrls, ...data.map((p) => ({
  //     loc: `/product/${p.slug}`, lastmod: p.updated_at, priority: 0.8,
  //   }))];

  return staticUrls;
});
