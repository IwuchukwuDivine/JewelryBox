# Nuxt Config Reference

## Full Example

```typescript
import tailwindcss from "@tailwindcss/vite"

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: false },
  ssr: false,
  components: true,

  // Global CSS
  css: ["~/assets/css/main.css", "~/assets/css/fonts.css"],

  // Vite plugins
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: { include: ["@vueuse/core"] },
  },

  // Dev server
  devServer: {
    port: 3005,
    host: "0.0.0.0",
  },

  // Modules
  modules: [
    "@pinia/nuxt",
    "pinia-plugin-persistedstate/nuxt",
    // Optional — only add when needed:
    // "@vite-pwa/nuxt",        // Only when user wants PWA
    // "@nuxt/image",
    // "@nuxt/fonts",
    // "@nuxtjs/sitemap",
    // "nuxt-lucide-icons",
    // "vue3-carousel-nuxt",
  ],

  // TypeScript
  typescript: { typeCheck: true },

  // Runtime config (env vars)
  runtimeConfig: {
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    },
  },

  // App head
  app: {
    head: {
      title: "App Name",
      htmlAttrs: { lang: "en" },
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
        { name: "description", content: "App description" },
        { name: "theme-color", content: "#6b45ff" },
        { name: "apple-mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      ],
      link: [
        { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
        { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
      ],
    },
  },

})
```

## PWA Config (Only When Requested)

Add `@vite-pwa/nuxt` to modules and this config block only when the user explicitly wants PWA:

```typescript
pwa: {
  registerType: "autoUpdate",
  manifest: {
    name: "App Name",
    short_name: "App",
    theme_color: "#6b45ff",
    background_color: "#ffffff",
    display: "standalone",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  workbox: {
    navigateFallback: "/",
    globPatterns: ["**/*.{js,css,html,png,svg,ico}"],
  },
},
```

## Standard Module Stack

| Module | Purpose |
|--------|---------|
| `@pinia/nuxt` | State management |
| `pinia-plugin-persistedstate/nuxt` | Persist store to localStorage |
| `@vite-pwa/nuxt` | PWA support (only when user requests PWA) |
| `@tailwindcss/vite` | Tailwind CSS v4 (Vite plugin) |
| `@nuxt/image` | Image optimization (optional) |
| `@nuxt/fonts` | Font loading (optional) |
| `nuxt-lucide-icons` | Icon library (optional) |
| `@tanstack/vue-query` | Data fetching/caching (npm, not a module) |
| `@vueuse/core` | Utility composables (npm, not a module) |
