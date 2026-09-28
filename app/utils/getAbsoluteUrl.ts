/**
 * Absolute URL for canonicals, og:url and JSON-LD.
 *
 * Reads the build-time-inlined site URL, so it works at module scope and
 * inside JSON.stringify without needing Nuxt context. The inlining happens
 * in nuxt.config.ts via `vite.define` — without that this silently returns
 * the fallback host in the client bundle.
 *
 * Called with no argument it returns the default share image.
 */
const SITE_URL = (
  process.env.NUXT_SITE_URL || "https://jewelrybox.ng"
).replace(/\/$/, "");

export default (path?: string) => {
  if (!path) return `${SITE_URL}/og-default.png`;
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
};
