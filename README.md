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

## Backend

Supabase — Postgres 17, local via the CLI. The schema is one migration,
`supabase/migrations/*_init_shop.sql`, and it is the security boundary of the
application: read its comments before changing it.

```bash
npm run db:start            # docker must be running
npm run db:reset            # apply migrations + seed from scratch
npm run db:types            # regenerate supabase/database.types.ts
npm run db:seed:generate    # rebuild supabase/seed.sql from app/utils/mock/
npm test                    # 363 tests: unit + DB
npm run test:db             # the DB suite alone
```

**Three rules the database enforces, because the UI cannot.**

1. The client never sets a price, a delivery fee, or a delivery method.
   `place_order()` reprices every line from the catalogue and derives the method
   from the address. `PlaceOrderInput` has no price field, and a price sent
   anyway is read by nothing.
2. An order's financial columns are immutable once placed. RLS has no column
   granularity, so this is column GRANTs plus a trigger — an admin client cannot
   rewrite `items` or skip `advance_order_status()`. The one editable column is
   `delivery_fee_ngn`, for a destination priced after the order.
3. Status moves follow `ORDER_FLOW` per payment method. The flow is stored as
   data in `order_flow`, so a test diffs it against
   `app/utils/constants/orderStatus.ts` rather than trusting two copies.

**Errors cross the seam as codes, never prose.** Every `raise exception` carries
a machine code in the exception's `hint`; the repository maps it to
`codedError()`; the UI branches on the code. The values live in
`app/utils/constants/errorCodes.ts`, and `codedError()` is typed to that union —
so a code the database raises that is missing from it is a compile error, not a
silently generic "try again".

**Seed.** `supabase/seed.sql` is generated from `app/utils/mock/` and must not be
hand-edited. That keeps the sample catalogue in one place, so the Phase F swap
from fixtures to Supabase cannot move a page count. It deliberately preserves
five holes — an unpriced state, an inactive rate, two sold-out pieces, two at
`stock_count: 2`, three made-to-order — each of which makes a real code path
reachable against the real database.

**The first admin is promoted out of band.** `handle_new_user()` always writes
`'customer'`: there is no auto-promotion path to abuse and no privileged email in
git. Locally, sign up and then run `npm run db:reset` — the seed promotes
`admin@jewelrybox.test` (override with `set jb.dev_admin_email`). In production,
once, in the Supabase SQL editor:

```sql
update public.profiles p set role = 'admin'
from auth.users u where u.id = p.id and lower(u.email) = lower('you@example.com');
```

A statement trigger refuses to leave the database with zero admins.

**Email.** Order mail is built in `server/utils/orderEmails.ts` (six templates,
customer and vendor) and sent through Resend by `sendOrderEmails.ts`. Colours come
from `server/utils/emailPalette.ts` — the light palette as literals, because email
clients resolve no CSS variables.

`app/utils/constants/brand.ts` holds the *dark* palette, which the four Satori
share cards import — a share card is a fixed PNG on someone else's feed, not a
themed surface, so it stays dark whatever the site does. The site itself must
never read those values; it uses the tokens in `main.css`.

Two palettes, two audiences, one knowing exception: `scripts/generate-icons.mjs`
is plain node and cannot import TypeScript, so it carries its own copy.

Supabase's own auth mail — confirmation, recovery, magic link, invite, email
change, password-changed — is branded in `supabase/templates/`, wired through the
`[auth.email.template.*]` blocks of `config.toml`. Those need a
`npm run db:stop && npm run db:start` to take effect; `db reset` does not reload
them, and the CLI does not validate the paths, so the only real check is sending
one and reading it.

With `RESEND_API_KEY` unset, `sendOrderEmails` logs and skips, so the whole order
flow is testable with no key. All local mail lands in Mailpit at
http://127.0.0.1:54324.

`/api/orders/notify` takes only `{ order_ref, email }`: the order is re-read from
the database and the template is derived from the row, because a client that can
name the template can tell a customer their unpaid order was delivered.
`order_emails` is the idempotency guard against a replay.

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
    ├── api/                # Supabase repositories (types/api.ts contracts)
    ├── getAbsoluteUrl.ts   # canonicals / og:url / JSON-LD
    ├── seoText.ts          # 60-char titles, 155-char descriptions
    ├── seo/schema.ts       # JSON-LD builders
    └── constants/brand.ts  # the identity, in one place
```

See `.claude/skills/nuxt-conventions/` for the project's Vue and Nuxt conventions.
