import tailwindcss from "@tailwindcss/vite";
// https://nuxt.com/docs/api/configuration/nuxt-config

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: false },
  // ssr: false, // uncomment for SPA-only apps (dashboards, admin panels)

  modules: [
    "@nuxt/eslint",
    "@nuxt/fonts",
    "@nuxt/image",
    "@pinia/nuxt",
    "pinia-plugin-persistedstate/nuxt",
    "nuxt-lucide-icons",
    // Optional — add when needed:
    // "@nuxtjs/sitemap",
    // "@vite-pwa/nuxt",
  ],

  // ── Fill in your app identity here ──
  app: {
    head: {
      title: "",
      htmlAttrs: { lang: "en" },
      meta: [
        { charset: "utf-8" },
        {
          name: "viewport",
          content:
            "width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover",
        },
        { name: "description", content: "" },
        { name: "keywords", content: "" },
        { name: "theme-color", content: "" },
        { name: "author", content: "" },

        // Open Graph
        { property: "og:site_name", content: "" },
        { property: "og:type", content: "website" },
        { property: "og:title", content: "" },
        { property: "og:description", content: "" },
        { property: "og:url", content: "" },
        { property: "og:image", content: "" },

        // Twitter Card
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: "" },
        { name: "twitter:description", content: "" },
        { name: "twitter:image", content: "" },
      ],
      link: [{ rel: "icon", type: "image/x-icon", href: "/favicon.ico" }],
    },
  },

  devServer: {
    port: 3000, // change per project so dev servers don't clash
    host: "0.0.0.0",
  },

  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: [
        '@tanstack/vue-query',
        '@vueuse/core',
        'lucide-vue-next',],
    },
  },

  // ── Custom fonts (drop .ttf files in app/assets/fonts/) ──
  // fonts: {
  //   families: [
  //     { name: "YourFont", src: "~/assets/fonts/YourFont-Regular.ttf", weight: 400 },
  //     { name: "YourFont", src: "~/assets/fonts/YourFont-Medium.ttf", weight: 500 },
  //     { name: "YourFont", src: "~/assets/fonts/YourFont-SemiBold.ttf", weight: 600 },
  //     { name: "YourFont", src: "~/assets/fonts/YourFont-Bold.ttf", weight: 700 },
  //   ],
  // },

  // ── Env vars (mirror them in .env.example) ──
  runtimeConfig: {
    // Server-only keys (not exposed to client)
    public: {
      siteUrl: process.env.SITE_URL || "",
    },
  },

  image: {
    quality: 80,
    format: ["webp", "jpg"],
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
