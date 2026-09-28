import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

/**
 * Two projects, deliberately split.
 *
 * `unit` imports `app/utils/**` directly and must stay a sub-second gate: no
 * Nuxt, no database, no environment. Those modules are written for Nuxt
 * auto-imports but are plain TypeScript whose only cross-file imports are
 * `import type` plus two value constants (`LAGOS`, `LOW_STOCK_THRESHOLD`), so
 * the `~` alias below is the entire adapter needed.
 *
 * `db` talks to the local Supabase stack, so it is slower, order-sensitive and
 * worth running alone — hence `npm run test:db`.
 */

const app = fileURLToPath(new URL("./app/", import.meta.url));

/** `~/utils/x` is how every module under `app/` refers to its siblings. */
const alias = { "~": app, "@": app };

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
        },
      },
      {
        resolve: { alias },
        test: {
          name: "db",
          environment: "node",
          include: ["tests/db/**/*.test.ts"],
          // SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY come
          // from `.env`, which is gitignored and machine-local. Never hardcode
          // them: the local CLI keys are fixed today but the file is the only
          // place that stays true after `supabase start` regenerates them.
          env: loadEnv("test", process.cwd(), ""),
          // Every spec creates and drops its own fixtures, but they share one
          // Postgres and two of them assert on global state (`rate_limits`),
          // so files run one at a time rather than racing.
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 30_000,
        },
      },
    ],
  },
});
