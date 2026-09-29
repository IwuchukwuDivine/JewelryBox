/**
 * Brand constants — the single place the identity is declared.
 *
 * Every hex here also exists in app/assets/css/main.css. They are repeated
 * because JSON-LD, the web manifest and the Satori OG components all need
 * literal values (Satori resolves no CSS variables). Change one, change both.
 *
 * Source: Claude Design project "JewelryBox" → `Brand Identity.dc.html`.
 */

export const SITE_NAME = "JewelryBox";
export const SITE_DOMAIN = "jewelrybox.ng";

export const SITE_DESCRIPTION =
  "A private collection of luxury wristwatches, fine jewelry and moissanite. Certified pieces, insured delivery across Nigeria.";

export const SITE_TAGLINE = "Luxury you can experience, not just purchase.";

/** X / Twitter handle used for `twitter:site` and JSON-LD `sameAs`. */
export const SOCIAL_X = "";
export const SOCIAL_INSTAGRAM = "";

/* ── Colour ──────────────────────────────────────────────────────────────
   Literals for the places CSS custom properties cannot reach. Today that is
   the Satori share cards, which render to PNG and resolve no variables.

   These are the DARK values on purpose: a share card is a fixed artifact on
   someone else's feed, not a surface that follows the visitor's theme. The
   site itself must never read these — it uses the semantic tokens in
   `main.css`, which switch with the theme.

   `scripts/generate-icons.mjs` still carries its own copies because it is a
   plain node script and cannot import TypeScript. That one duplication is
   knowingly left, and its comment says so.
   ────────────────────────────────────────────────────────────────────────── */

export const OBSIDIAN = "#121010";
export const OBSIDIAN_RAISED = "#1A1715";
export const HAIRLINE_DARK = "#2C2724";
export const IVORY = "#F6F1E8";
export const BONE = "#F3EEE6";
export const BONE_SOFT = "#C9C0B4";
export const BONE_MUTED = "#8C8378";
export const CHAMPAGNE = "#C8A97E";
/** Dark-theme success. The light value lives in `main.css` as `--color-success`. */
export const SUCCESS_DARK = "#6FA07A";

/** `theme-color` meta values. Light is the launch default; see `useTheme()`. */
export const THEME_COLOR_DARK = OBSIDIAN;
export const THEME_COLOR_LIGHT = IVORY;

/* ── Assets ──────────────────────────────────────────────────────────── */

/** Static share card. Per-page cards from nuxt-og-image override it. */
export const DEFAULT_OG_IMAGE = "/og-default.png";

export const LOCKUP_DARK = "/brand-assets/lockup-white.png";
export const LOCKUP_LIGHT = "/brand-assets/lockup-black.png";
export const MONOGRAM_DARK = "/brand-assets/monogram-white.png";
export const MONOGRAM_LIGHT = "/brand-assets/monogram-black.png";

/* ── Commerce ────────────────────────────────────────────────────────── */

export const CURRENCY = "NGN";
export const COUNTRY = "NG";
