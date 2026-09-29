/**
 * Build the favicon / app-icon / default-OG set from the brand assets.
 *
 * Source art is transparent PNG (public/brand-assets/). Every output here is
 * composited onto the brand's obsidian ground first — transparent monograms
 * read as mush in a browser tab and iOS refuses alpha on home-screen icons.
 *
 *   node scripts/generate-icons.mjs
 */
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const brand = (f) => resolve(root, "public/brand-assets", f);
const out = (f) => resolve(root, "public", f);

/** Brand ground + hairline. Keep in sync with app/utils/constants/brand.ts. */
const GROUND = { r: 0x12, g: 0x10, b: 0x10, alpha: 1 }; // #121010
const HAIRLINE = "#2C2724";

const MONOGRAM = brand("monogram-white.png");
const LOCKUP = brand("lockup-white.png");

/** Monogram on a square obsidian tile. `scale` = glyph height ÷ tile height. */
async function tile(size, scale) {
  const glyphH = Math.round(size * scale);
  const glyph = await sharp(MONOGRAM)
    .resize({ height: glyphH, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  return sharp({
    create: { width: size, height: size, channels: 4, background: GROUND },
  })
    .composite([{ input: glyph, gravity: "center" }])
    .png()
    .toBuffer();
}

const write = async (name, buf) => {
  writeFileSync(out(name), buf);
  console.log(`  ${name.padEnd(34)} ${(buf.length / 1024).toFixed(1)}K`);
};

console.log("icons");

// Browser tab + shortcut. Generous glyph — it is read at 16px.
await write("favicon-96x96.png", await tile(96, 0.68));

// iOS home screen. No alpha, slightly tighter so the OS corner radius misses it.
await write("apple-touch-icon.png", await tile(180, 0.6));

// Android maskable: the safe zone is the inner 80%, so the glyph stays small.
await write("web-app-manifest-192x192.png", await tile(192, 0.46));
await write("web-app-manifest-512x512.png", await tile(512, 0.46));

// .ico carries three sizes; sharp has no ICO encoder, hence png-to-ico.
const icoSizes = await Promise.all([16, 32, 48].map((s) => tile(s, 0.72)));
await write("favicon.ico", await pngToIco(icoSizes));

// ── Default OG card ────────────────────────────────────────────────────
// The static fallback behind app.head. Per-page cards (nuxt-og-image)
// override it. Wordmark lockup on obsidian inside a hairline frame —
// no type is drawn here, so no font has to be installed to build it.
const OG_W = 1200;
const OG_H = 630;
const INSET = 48;

const lockup = await sharp(LOCKUP)
  .resize({ width: 560, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .toBuffer();

const frame = Buffer.from(
  `<svg width="${OG_W}" height="${OG_H}" xmlns="http://www.w3.org/2000/svg">
     <rect x="${INSET}.5" y="${INSET}.5" width="${OG_W - INSET * 2 - 1}" height="${OG_H - INSET * 2 - 1}"
           fill="none" stroke="${HAIRLINE}" stroke-width="1"/>
   </svg>`,
);

const og = await sharp({
  create: { width: OG_W, height: OG_H, channels: 4, background: GROUND },
})
  .composite([
    { input: frame },
    { input: lockup, gravity: "center" },
  ])
  .png()
  .toBuffer();

console.log("og");
await write("og-default.png", og);
