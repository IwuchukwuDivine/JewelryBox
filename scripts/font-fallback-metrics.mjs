/**
 * Emit metric-adjusted @font-face fallbacks.
 *
 * @nuxt/fonts only generates these for its remote providers — for
 * `provider: "local"` the `fallbacks` option just widens the font stack and
 * no size-adjust / ascent-override is produced, so the page still reflows
 * when a face swaps in. This reads the real metrics out of our TTFs and
 * writes the override block that removes that reflow.
 *
 *   node scripts/font-fallback-metrics.mjs   # prints CSS to stdout
 *
 * Paste the output into app/assets/css/main.css (the FALLBACK METRICS
 * block) and re-run whenever a face changes.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { fromBuffer } from "@capsizecss/unpack";
import { generateFontFace, getMetricsForFamily } from "fontaine";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Each web family and the local faces its fallback should be matched to. */
const FAMILIES = [
  { family: "Marcellus", file: "marcellus-og-400.ttf", fallbacks: ["Georgia", "Times New Roman"] },
  { family: "Instrument Sans", file: "instrument-sans-og-400.ttf", fallbacks: ["Arial", "Helvetica"] },
  { family: "IBM Plex Mono", file: "ibm-plex-mono-og-400.ttf", fallbacks: ["Courier New"] },
];

const out = [];

for (const { family, file, fallbacks } of FAMILIES) {
  const buffer = readFileSync(resolve(root, "public/fonts/og", file));
  const metrics = await fromBuffer(buffer);

  for (const fallback of fallbacks) {
    const fallbackMetrics = await getMetricsForFamily(fallback);
    if (!fallbackMetrics) {
      console.error(`  ! no metrics for ${fallback}, skipped`);
      continue;
    }
    out.push(
      generateFontFace(metrics, {
        name: `${family} Fallback: ${fallback}`,
        font: fallback,
        metrics: fallbackMetrics,
      }).trim(),
    );
  }
}

console.log(out.join("\n\n"));
