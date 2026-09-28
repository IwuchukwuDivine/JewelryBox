/**
 * The Supabase lane of the seam.
 *
 * Thirteen singletons, one per interface in `types/api.ts`, each typed against
 * its interface so a drift from the contract is a `npm run typecheck` failure
 * rather than a review comment. Phase F is one import-path change per
 * repository in `app/utils/repositories.ts`:
 *
 *   -import { mockProductsRepo } from "~/utils/mock";
 *   +import { supabaseProductsRepo } from "~/utils/api";
 *
 * `export *` rather than a re-export list on purpose: unimport resolves a star
 * export back to the file it came from, so the barrel adds no second
 * auto-import entry for a name the module file already registers.
 */

export * from "./products";
export * from "./wishlist";
export * from "./delivery";
export * from "./orders";
export * from "./announcements";
export * from "./auth";
export * from "./addresses";

export * from "./admin/products";
export * from "./admin/orders";
export * from "./admin/rates";
export * from "./admin/announcements";
export * from "./admin/settings";
export * from "./admin/stats";
