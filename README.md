# JewelryBox

A private collection of luxury wristwatches, fine jewelry and moissanite.
Nuxt 4 · TypeScript · Tailwind v4 · Pinia · Supabase · SSR on Vercel.

```bash
npm install
cp .env.example .env
npm run dev
```

## Brand system

The design system is the Claude Design project **JewelryBox** — `Brand Identity.dc.html`
(tokens, type scale, motion) and `JewelryBox Prototype.dc.html` (screens). Treat those
as the source of truth; do not invent colours or type sizes.

| | |
|---|---|
| Palette | Warm — obsidian `#121010` / ivory `#F6F1E8`, champagne accent `#C8A97E` |
| Type | Marcellus (display) · Instrument Sans 400/500/600 (UI) · IBM Plex Mono 400/500 (specs, prices) |
| Radius | `2px`, everywhere. `50%` for avatars only. |
| Motion | `cubic-bezier(.16,1,.3,1)` · 240 / 600 / 1200ms. Nothing bounces. |

Tokens live in `app/assets/css/main.css`: brand constants in `@theme`, semantic
tokens in `:root` / `.dark`. **Components reference the semantic layer only.**
Literal hexes needed outside CSS (JSON-LD, the manifest, the Satori OG cards)
come from `app/utils/constants/brand.ts`.

**Light is the launch default.** The OS preference is deliberately not consulted —
a first-time visitor always gets ivory. `useTheme()` persists an explicit choice
under `jb-theme`, and a critical inline script in `nuxt.config.ts` applies it
before first paint.

## Fonts

Two families per face, on purpose:

- `public/fonts/v1/*.woff2` — what browsers download (177 KB for six faces)
- `public/fonts/og/*.ttf` — Satori only; it cannot read WOFF2

Both are declared in `nuxt.config.ts` → `fonts.families`. The OG families are
never referenced by site CSS, so browsers never fetch them. `v1/` is versioned
because `vercel.json` caches `/fonts/` for a year — move to `v2/` if a face changes.

```bash
npm run fonts:woff2    # public/fonts/og/*.ttf  →  public/fonts/v1/*.woff2
npm run fonts:metrics  # regenerate the FALLBACK METRICS block in main.css
npm run icons          # favicons, app icons and og-default.png from brand-assets/
```

## SEO

Every indexable page calls `usePageSeo()` once — it handles the title (capped at
60 chars), description, Open Graph, Twitter, the share card, the canonical and
JSON-LD together.

```ts
usePageSeo({
  title: "Watches",
  description: "Automatic and quartz timepieces, certified and insured.",
  path: "/watches",
  ogImage: { card: "Collection", props: { pill: "The Watch Edit", count: 24 } },
  jsonLd: collectionSchema({ ... }),
});
```

Share cards are Vue components rendered by Satori in `app/components/OgImage/`:
`Default`, `Collection`, `Product`, `Campaign`. Satori resolves no CSS variables,
needs `display: flex` on anything with more than one child, has no `line-clamp`,
and ignores the `inset` shorthand — each file documents this.

Sitemap URLs come from `server/api/__sitemap__/urls.ts` at runtime, so catalogue
changes appear without a redeploy. Private routes are excluded in three places:
that endpoint, `sitemap.exclude`, and `public/robots.txt`.

**Search Console** is not yet verified — do it by DNS TXT on the Vercel domain, or
drop the `google*.html` token file into `public/`.

## Folder guide

```
app/
├── assets/css/main.css     # brand tokens + reusable classes
├── components/
│   ├── OgImage/            # Satori share cards (*.satori.vue)
│   ├── AppLogo.vue         # wordmark is type, not an image
│   └── AppThemeToggle.vue  # hydration-safe: icons swap in CSS
├── composables/            # useTheme, usePageSeo, useTag, useToast
└── utils/
    ├── getAbsoluteUrl.ts   # canonicals / og:url / JSON-LD
    ├── seoText.ts          # 60-char titles, 155-char descriptions
    ├── seo/schema.ts       # JSON-LD builders
    └── constants/brand.ts  # the identity, in one place
```

See `.claude/skills/nuxt-conventions/` for the project's Vue and Nuxt conventions.
