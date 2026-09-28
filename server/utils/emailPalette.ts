/**
 * The email palette — one set of literals for every server-rendered email.
 *
 * These mirror the **light (ivory) layer** of `:root` in
 * `app/assets/css/main.css`, resolved through the `@theme` primitives it points
 * at (`--color-ivory*`, `--color-ink*`, `--color-champagne-deep*`,
 * `--color-ivory-line`). Email clients resolve no CSS custom properties, so a
 * literal hex is unavoidable here — which is exactly why they live in one file
 * rather than being retyped per template. Change a value in `main.css`, change
 * it here in the same commit.
 *
 * ── Why not `app/utils/constants/brand.ts` ───────────────────────────────
 * That file deliberately carries the **dark** set, and it must keep it: the
 * four Satori share cards in `app/components/OgImage/*.satori.vue` read
 * `OBSIDIAN` / `BONE*` / `CHAMPAGNE` and stay dark on purpose — a share card is
 * a fixed PNG on someone else's feed, not a theme-aware surface, and Satori
 * cannot read CSS variables at all. So `OBSIDIAN` there is an accurate name
 * holding a correct value, and `CHAMPAGNE` there is `#C8A97E`, the *dark*
 * accent, which fails AA on ivory. Importing any of it into an ivory email
 * would mean the opposite of its name.
 *
 * ── Contrast, measured ───────────────────────────────────────────────────
 * The render harness under `scratchpad/render-emails.ts` asserts all of this.
 *
 *   TEXT_PRIMARY   on SURFACE 15.8:1 · on SURFACE_ELEVATED 17.8:1   AA
 *   TEXT_SECONDARY on SURFACE_MUTED 9.3:1 · on SURFACE 8.7:1        AA
 *   TEXT_MUTED     on SURFACE 5.1:1 · on SURFACE_ELEVATED 5.8:1     AA
 *   ACCENT         3.5–4.0:1 on these grounds — clears AA for LARGE text
 *                  only (>= 24px). Use it for hero figures and borders,
 *                  never for body-sized type.
 *   ON_ACCENT on ACCENT_FILL 4.9:1                                  AA
 *   ON_ACCENT on ACCENT      3.7:1  — a FAIL, which is why a filled button
 *                  uses ACCENT_FILL, the deeper rung, and not ACCENT.
 *   ERROR          on SURFACE_ELEVATED 5.6:1                         AA
 *   SUCCESS        on SURFACE_ELEVATED 5.1:1                         AA
 */

/* ── Surfaces ─────────────────────────────────────────────────────────── */

/** `--surface` / `--color-ivory` · the page ground behind the card. */
export const SURFACE = "#F6F1E8";
/** `--surface-muted` / `--color-ivory-raised` · recessed panels, summaries. */
export const SURFACE_MUTED = "#FBF8F2";
/** `--surface-elevated` / `--color-ivory-elevated` · the card itself. */
export const SURFACE_ELEVATED = "#FFFFFF";

/* ── Ink ──────────────────────────────────────────────────────────────── */

/** `--text-primary` / `--color-ink` · headings, figures, the order number. */
export const TEXT_PRIMARY = "#1C1714";
/** `--text-secondary` / `--color-ink-soft` · body copy. */
export const TEXT_SECONDARY = "#4A423C";
/** `--text-muted` / `--color-ink-muted` · captions, micro-labels, footers. */
export const TEXT_MUTED = "#6E645A";

/* ── Lines ────────────────────────────────────────────────────────────── */

/** `--border-default` / `--color-ivory-line` · every hairline. */
export const BORDER = "#E3DBCF";

/* ── Accent ───────────────────────────────────────────────────────────── */

/**
 * `--accent` / `--color-champagne-deep`. **Not** `#C8A97E` — that is the dark
 * theme's accent and it fails contrast on ivory. Large display type (>= 24px)
 * and borders only.
 */
export const ACCENT = "#9C7A4B";
/**
 * `--accent-hover` / `--color-champagne-deeper`. The fill behind a button,
 * because a button's small label needs 4.5:1 and `ACCENT` gives only 3.7:1.
 */
export const ACCENT_FILL = "#86673D";
/** `--on-accent` · type sitting on an accent fill. */
export const ON_ACCENT = "#FBF8F2";

/* ── Status · the light layer's values, not the dark ones ─────────────── */

/** `--color-success`, light layer. Dark is `#6FA07A` — do not use that here. */
export const SUCCESS = "#3F7A4C";
/** `--color-error`, light layer. Also the vendor "action required" flag. */
export const ERROR = "#B04543";
/** `--color-warning`, light layer. */
export const WARNING = "#A67A2E";
/** `--color-info`, light layer. */
export const INFO = "#4A5F7A";
