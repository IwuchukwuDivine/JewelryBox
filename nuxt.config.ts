// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";

/* ── Identity ────────────────────────────────────────────────────────────
   Mirrored in app/utils/constants/brand.ts, which is what components read.
   This file needs its own copies because nuxt.config runs outside the app. */
const SITE_NAME = "JewelryBox";
const SITE_URL = (
  process.env.NUXT_SITE_URL || "https://jewelrybox.ng"
).replace(/\/$/, "");
const SITE_DESCRIPTION =
  "A private collection of luxury wristwatches, fine jewelry and moissanite. Certified pieces, insured delivery across Nigeria.";
const SITE_KEYWORDS =
  "luxury watches Nigeria, wristwatches Lagos, fine jewelry, moissanite Nigeria, engagement rings Lagos, automatic watches, JewelryBox";
const OG_IMAGE = `${SITE_URL}/og-default.png`;

/** Obsidian — dark is the launch default, so it is the advertised theme colour. */
// Ivory: light is the default theme, so the browser chrome matches it.
const THEME_COLOR = "#F6F1E8";

const isProduction = process.env.NODE_ENV === "production";

/* `vite.define` below inlines SITE_URL into the client bundle, so a production
   build carries whatever NUXT_SITE_URL was set at build time — permanently, in
   every canonical, og:url and JSON-LD @id. A developer's .env says
   http://localhost:3000, which is correct for dev and catastrophic once
   deployed. Fail the build rather than find out from Search Console.

   Gated on the argv command, not on NODE_ENV alone: `nuxi prepare` and
   `nuxi typecheck` both run with NODE_ENV=production, and they must stay green
   against a local .env. Only `nuxt build` / `nuxt generate` bake the value in. */
const isBundling = process.argv.some((a) => a === "build" || a === "generate");

if (
  isProduction &&
  isBundling &&
  /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:|\/|$)/.test(SITE_URL)
) {
  throw new Error(
    `NUXT_SITE_URL is "${SITE_URL}" in a production build. Set it to the real origin (e.g. https://jewelrybox.ng) in the deployment environment.`,
  );
}

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: false },
  ssr: true,

  modules: [
    "@nuxt/eslint",
    "@nuxt/fonts",
    "@nuxt/image",
    "@pinia/nuxt",
    "pinia-plugin-persistedstate/nuxt",
    "nuxt-lucide-icons",
    "@nuxtjs/sitemap",
    "nuxt-og-image",
    "nuxt-gtag",
  ],

  // ── Site (required by @nuxtjs/sitemap and nuxt-og-image) ──
  site: {
    url: SITE_URL,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
  },

  app: {
    // Page change · 400ms fade, content enters from 16px below.
    // Classes live in main.css; the reduced-motion block flattens them.
    pageTransition: { name: "page", mode: "out-in" },
    head: {
      title: SITE_NAME,
      titleTemplate: `%s | ${SITE_NAME}`,
      htmlAttrs: { lang: "en" },
      meta: [
        { charset: "utf-8" },
        {
          name: "viewport",
          content:
            "width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover",
        },
        { name: "description", content: SITE_DESCRIPTION },
        { name: "keywords", content: SITE_KEYWORDS },
        { name: "theme-color", content: THEME_COLOR },
        { name: "author", content: SITE_NAME },
        { name: "apple-mobile-web-app-title", content: SITE_NAME },

        // Open Graph
        { property: "og:site_name", content: SITE_NAME },
        { property: "og:type", content: "website" },
        { property: "og:locale", content: "en_NG" },
        { property: "og:title", content: SITE_NAME },
        { property: "og:description", content: SITE_DESCRIPTION },
        { property: "og:url", content: SITE_URL },
        { property: "og:image", content: OG_IMAGE },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:image:alt", content: `${SITE_NAME} — ${SITE_DESCRIPTION}` },

        // Twitter / X
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: SITE_NAME },
        { name: "twitter:description", content: SITE_DESCRIPTION },
        { name: "twitter:image", content: OG_IMAGE },
      ],
      link: [
        { rel: "icon", type: "image/png", sizes: "96x96", href: "/favicon-96x96.png" },
        { rel: "shortcut icon", href: "/favicon.ico" },
        { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
        { rel: "manifest", href: "/site.webmanifest" },
      ],
      script: [
        {
          // Apply the stored (or OS) colour scheme before first paint, so a
          // dark visitor never sees an ivory flash. Key must match
          // THEME_STORAGE_KEY in app/composables/useTheme.ts.
          key: "theme-init",
          tagPriority: "critical",
          innerHTML: `(function(){try{if(localStorage.getItem("jb-theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}})();`,
        },
        // Vercel Web Analytics + Speed Insights. Injected by Vercel at the
        // edge when the features are enabled on the project — the npm
        // wrappers are not used because they still peer on vue-router 4
        // and this project is on 5. They 404 anywhere but Vercel, hence
        // the production guard.
        ...(isProduction
          ? [
              { src: "/_vercel/insights/script.js", defer: true },
              { src: "/_vercel/speed-insights/script.js", defer: true },
            ]
          : []),
      ],
    },
  },

  // ── Fonts ───────────────────────────────────────────────────────────
  // Two families per face, deliberately. The browser set is WOFF2 in
  // public/fonts/v1/; Satori (nuxt-og-image) cannot read WOFF2 and takes
  // the first source per face, so the OG cards get their own TTF-backed
  // "… OG" families from public/fonts/og/. Those are declared but never
  // referenced by site CSS, so browsers never download them.
  //
  // `weights` arrays + `global: true` are what nuxt-og-image reads; listing
  // faces per-weight instead makes Satori fall back to Inter.
  // `fallbacks` only widens the emitted font stack — @nuxt/fonts does not
  // produce metric overrides for local families. Those are generated by
  // scripts/font-fallback-metrics.mjs into the FALLBACK METRICS block of
  // main.css, which is what actually stops the swap reflowing the page.
  //
  // v1/ is versioned because vercel.json caches /fonts/ for a year — if a
  // face ever changes, move the set to v2/ so returning browsers refetch.
  fonts: {
    // The font stacks are declared as CSS custom properties (--font-display
    // et al in main.css), which @nuxt/fonts does not inspect by default —
    // without this it never emits the metric-adjusted fallback faces that
    // `fallbacks` below exists to produce, and the swap reflows the page.
    experimental: {
      processCSSVariables: true,
    },
    families: [
      {
        name: "Marcellus",
        provider: "local",
        weights: [400],
        global: true,
        fallbacks: ["Georgia", "Times New Roman", "serif"],
      },
      {
        name: "Instrument Sans",
        provider: "local",
        weights: [400, 500, 600],
        global: true,
        fallbacks: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      {
        name: "IBM Plex Mono",
        provider: "local",
        weights: [400, 500],
        global: true,
        fallbacks: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      // Satori-only duplicates.
      { name: "Marcellus OG", provider: "local", weights: [400], global: true },
      { name: "Instrument Sans OG", provider: "local", weights: [400, 500, 600], global: true },
      { name: "IBM Plex Mono OG", provider: "local", weights: [400, 500], global: true },
    ],
  },

  // ── Share cards ─────────────────────────────────────────────────────
  // app.head advertises 1200×630; the module default is 1200×600.
  ogImage: {
    defaults: { width: 1200, height: 630 },
  },

  // ── Sitemap ─────────────────────────────────────────────────────────
  // Keep `exclude` as ONE array — a second key silently overrides the
  // first, which is how private routes creep back into the index.
  sitemap: {
    sources: ["/api/__sitemap__/urls"],
    exclude: [
      "/account",
      "/account/**",
      "/admin",
      "/admin/**",
      "/checkout",
      "/checkout/**",
      "/wishlist",
      "/search",
    ],
    defaults: {
      changefreq: "weekly",
      priority: 0.7,
    },
    sitemaps: false,
  },

  // ── Analytics ───────────────────────────────────────────────────────
  // The gtag script (~167 KB) is only fetched once a visitor grants
  // consent — see app/composables/useTag.ts.
  gtag: {
    id: process.env.NUXT_PUBLIC_GTAG_ID || "",
    enabled: isProduction,
    initMode: "manual",
    initCommands: [
      [
        "consent",
        "default",
        {
          ad_user_data: "denied",
          ad_personalization: "denied",
          ad_storage: "denied",
          analytics_storage: "denied",
          wait_for_update: 500,
        },
      ],
    ],
  },

  // Auto-import nested util directories too (app/utils/seo/*), which Nuxt
  // does not scan by default.
  imports: {
    dirs: ["utils/**"],
  },

  routeRules: {
    // Marketing pages are static. Add /about, /contact and /faq here as
    // those pages land — prerendering a route that does not exist fails
    // the build.
    "/": { prerender: true },
    // Private surfaces: rendered per request, never prerendered, and
    // excluded from the sitemap above + disallowed in public/robots.txt.
    "/account/**": { prerender: false },
    "/admin/**": { prerender: false },
    "/checkout/**": { prerender: false },
    "/wishlist": { prerender: false },
  },

  devServer: {
    port: 3000,
    host: "0.0.0.0",
  },

  vite: {
    plugins: [tailwindcss()],
    define: {
      // getAbsoluteUrl() runs at module scope and inside JSON.stringify, so
      // it cannot reach runtimeConfig. Inlining the value is what makes
      // canonicals correct in the client bundle.
      "process.env.NUXT_SITE_URL": JSON.stringify(SITE_URL),
    },
    optimizeDeps: {
      include: ["@tanstack/vue-query", "@vueuse/core", "lucide-vue-next"],
    },
  },

  // ── Runtime config ──────────────────────────────────────────────────
  // Anything under `public` reaches the client bundle; everything else is
  // server-only. Mirror every key added here in .env.example.
  //
  // The Supabase URL and anon key appear in BOTH halves on purpose: the
  // browser client needs them to carry the user's session into RLS, and the
  // Nitro routes need them without going through `public`. The service-role
  // key is server-only and must never move — it bypasses RLS entirely.
  runtimeConfig: {
    supabaseUrl: process.env.SUPABASE_URL || "",
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",

    // Transactional email (Resend). Unset in dev → sendOrderEmails logs and
    // skips, so the order flow stays testable without an API key.
    resendApiKey: process.env.RESEND_API_KEY || "",
    fromEmail: process.env.FROM_EMAIL || "JewelryBox <orders@jewelrybox.ng>",
    vendorEmail: process.env.VENDOR_EMAIL || "",

    public: {
      siteUrl: SITE_URL,
      supabaseUrl: process.env.SUPABASE_URL || "",
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
    },
  },

  image: {
    quality: 80,
    format: ["webp", "jpg"],
    // Mock catalogue photography is served from Unsplash while the frontend
    // lane builds against fixtures. Drop this once real product images land
    // in Supabase storage (Phase F).
    domains: ["images.unsplash.com"],
    screens: {
      xs: 320,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
    },
  },

  typescript: {
    typeCheck: true,
  },
  components: true,
  css: ["~/assets/css/main.css"],
});
