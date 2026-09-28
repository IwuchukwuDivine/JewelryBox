# Nuxt Starter Template

A reusable starter for new Nuxt projects — Nuxt 4 + TypeScript + Tailwind v4 + Pinia (persisted) + Vue Query + Lucide icons. Clone it, fill in the blanks, and start building.

> **Want a PWA?** Use the [`pwa` branch](../../tree/pwa) instead — same template plus `@vite-pwa/nuxt`, a manifest ready to fill in, and icon generation via `npm run generate-pwa-assets`. When clicking **Use this template**, tick **Include all branches**, then `git checkout pwa` in your new repo.

## Getting Started

Click **Use this template** (top right on GitHub) to create your new project repo, then:

```bash
npm install
cp .env.example .env
npm run dev
```

## Fill In Per Project

1. **`package.json`** → change `name`
2. **`nuxt.config.ts`** → fill in the empty `app.head` section (title, description, OG/Twitter tags, theme color), set the `devServer.port`, and add env vars to `runtimeConfig`
3. **`app/assets/css/main.css`** → replace the placeholder palette in `@theme` and the semantic tokens (`:root` / `.dark`) with your brand colors
4. **`.env.example`** → document the project's env vars, then `cp .env.example .env`
5. **`public/`** → replace `favicon.ico`, add your logo and icons
6. **Fonts** → drop `.ttf` files in `app/assets/fonts/`, uncomment the `fonts` block in `nuxt.config.ts`, and update `--font-family` in `main.css`

## Folder Guide

```
app/
├── app.vue              # Root component — skip link, toast, layout + page
├── error.vue            # Global error page (404 / 500)
├── assets/
│   ├── css/main.css     # Tailwind + brand theme tokens + reusable classes
│   └── fonts/           # Custom font files (.ttf), wired via nuxt.config fonts block
├── components/          # Auto-imported Vue components (PascalCase)
│   │                    # Prefix base UI with App: AppButton, AppInput, AppToast
│   └── App/             # Base UI components (App/Button.vue → <AppButton />)
├── composables/         # Auto-imported composables — useX pattern
│   │                    # Composable = needs reactivity, lifecycle, or store access
│   ├── useApp.ts        # App store accessor (storeToRefs wrapper)
│   ├── useToast.ts      # useToast("success" | "error" | "warning" | "info", msg)
│   └── useMounted.ts    # SSR-safe mounted flag
├── layouts/             # Page layouts — must contain <slot />
│   └── default.vue      # Base layout; add admin.vue, no-auth.vue, etc. as needed
├── middleware/          # Route guards — apply via definePageMeta({ middleware: "x" })
│   └── auth.ts          # Example login guard
├── pages/               # File-based routing — keep lean, delegate to components
├── plugins/             # Nuxt plugins
│   └── vue-query.ts     # TanStack Query setup (SSR hydration included)
├── store/               # Pinia stores — setup syntax, persisted to localStorage
│   └── app.ts           # Global app store (toasts, auth state)
└── utils/               # Auto-imported pure functions — one per file, default export
    │                    # Util = pure in/out, no Vue reactivity
    ├── types/           # Shared TypeScript types (never inline complex types)
    ├── constants/       # App constants and static data
    ├── rules.ts         # Form validation rules (required, email, password)
    └── ...              # goTo, goBack, copy, formatDate, formatPrice, log, uuid

server/
└── api/                 # Nitro API routes — file name maps to URL
                         # health.get.ts → GET /api/health

public/                  # Static files served as-is (favicon, robots.txt, images)

.claude/
└── skills/
    └── nuxt-conventions/  # Claude Code skill — enforces these project conventions
                           # (directory structure, script setup, styling, stores)
```

## Conventions

- **Always `<script setup lang="ts">`** — never Options API
- **Auto-imports** — don't import `ref`, `computed`, `useRouter`, composables, or utils; only import types, third-party libs, and subfolder components
- **Pages are lean** — business logic lives in composables, markup in components
- **No repeated styles** — extract shared styles into `main.css`; use CSS variables from the theme, never hardcode colors
- **Types live in `utils/types/`**, constants in `utils/constants/`
- **`v-if` always pairs with `v-else`** — never leave a blank state
- **Wrap browser-only components in `<ClientOnly>`** when SSR is on

## Optional Modules (add when needed)

| Module | Purpose |
|--------|---------|
| `@vite-pwa/nuxt` | PWA / installable app — already set up on the `pwa` branch |
| `@nuxtjs/sitemap` | Sitemap generation (needs `site.url` in config) |
| `@supabase/supabase-js` | Supabase backend |
| `resend` | Transactional email (server-side) |

## Scripts

```bash
npm run dev        # dev server
npm run build      # production build
npm run generate   # static site generation
npm run preview    # preview production build
```
