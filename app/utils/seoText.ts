/** Google truncates titles past ~60 chars and descriptions past ~155. */
export const TITLE_MAX = 60;
export const DESCRIPTION_MAX = 155;

/**
 * Clip `text` to at most `max` characters, cutting at a word boundary and
 * stripping any trailing `,` `:` `;` left behind by the cut. Returns the
 * trimmed text unchanged when it already fits.
 */
export function clipAtWord(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;

  // Look one character past the limit so a word ending exactly at `max` survives.
  const window = trimmed.slice(0, max + 1);
  const lastSpace = window.lastIndexOf(" ");
  const clipped =
    lastSpace > 0 ? window.slice(0, lastSpace) : trimmed.slice(0, max);

  return clipped.replace(/[\s,:;]+$/, "");
}

/**
 * Build a meta description of at most `max` characters: whole sentences are
 * accumulated while the total still fits; if even the first sentence is too
 * long it is clipped at a word boundary and ended with an ellipsis.
 */
export function seoDescription(text: string, max = DESCRIPTION_MAX): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;

  const sentences = trimmed.split(/(?<=[.!?])\s+/);
  let result = "";
  for (const sentence of sentences) {
    const candidate = result ? `${result} ${sentence}` : sentence;
    if (candidate.length > max) break;
    result = candidate;
  }

  if (result) return result;
  return `${clipAtWord(trimmed, max - 1)}…`;
}

/**
 * `<page title> | JewelryBox` when that fits in 60 characters, otherwise the
 * page title alone. Pages using this must also set `titleTemplate: "%s"` so
 * the brand is not appended twice.
 */
export function pageTitle(base: string, siteName = "JewelryBox"): string {
  const full = `${base} | ${siteName}`;
  if (full.length <= TITLE_MAX) return full;
  return clipAtWord(base, TITLE_MAX);
}
