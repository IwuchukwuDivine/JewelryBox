/**
 * Build the browser font set from the Satori TTFs.
 *
 * public/fonts/og/*.ttf  →  public/fonts/v1/*.woff2
 *
 * The `-og-` copies stay as TTF because Satori (nuxt-og-image) cannot read
 * WOFF2; the browser gets the WOFF2 set, which is roughly half the bytes.
 * Both families are declared in nuxt.config.ts `fonts.families`.
 *
 * Run once after changing a face:  node scripts/fonts-to-woff2.mjs
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { compress } from "wawoff2";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ogDir = resolve(root, "public/fonts/og");
const webDir = resolve(root, "public/fonts/v1");

mkdirSync(webDir, { recursive: true });

const files = readdirSync(ogDir).filter((f) => f.endsWith(".ttf"));
if (!files.length) throw new Error(`No TTFs in ${ogDir}`);

let total = 0;
let compressed = 0;

for (const file of files) {
  // marcellus-og-400.ttf → marcellus-400.woff2
  const out = file.replace("-og-", "-").replace(/\.ttf$/, ".woff2");
  const ttf = readFileSync(resolve(ogDir, file));
  const woff2 = Buffer.from(await compress(ttf));
  writeFileSync(resolve(webDir, out), woff2);

  total += ttf.length;
  compressed += woff2.length;
  const pct = Math.round((1 - woff2.length / ttf.length) * 100);
  console.log(
    `  ${file.padEnd(28)} → ${out.padEnd(26)} ${(ttf.length / 1024).toFixed(0)}K → ${(woff2.length / 1024).toFixed(0)}K  (-${pct}%)`,
  );
}

console.log(
  `\n${files.length} faces · ${(total / 1024).toFixed(0)}K TTF → ${(compressed / 1024).toFixed(0)}K WOFF2`,
);
