import { beforeAll, describe, expect, it } from "vitest";
import { mockConfig, mockProductsRepo } from "~/utils/mock";
import { MOCK_PRODUCTS } from "~/utils/mock/products";
import type { ProductCategory, ProductFilters } from "~/utils/types/shop";

/**
 * `ProductFilters.categories` — the multi-category case, and why it is tested
 * by counting rather than by "did it come back".
 *
 * A nav collection such as Jewelry spans four categories. Before `categories`
 * existed there was no way to express that, so `/jewelry` resolved to *no*
 * category filter and quietly served the whole 28-piece catalogue, watches
 * included. Nothing threw, nothing was empty, the page just showed the wrong
 * products under a top-level nav item. That is the shape of this failure: a
 * consumer that ignores `categories` returns **too much**.
 *
 * So every assertion below is on counts and membership. A test that only
 * checked for an absence of errors, or that the list was non-empty, would have
 * passed throughout the entire life of the bug.
 *
 * This exercises the one pure form available today — `matchesFilters` inside
 * `app/utils/mock/index.ts` is not exported, so it is reached through
 * `mockProductsRepo.list()` with latency switched off. The equivalent
 * assertions against real rows live in `tests/db/productFilters.test.ts`;
 * neither imports `app/utils/api/products.ts`, which another lane still owns.
 *
 * Caveat for whoever touches this next: `app/utils/mock/index.ts` leans on Nuxt
 * auto-imports (`codedError`, `ERROR_CODES`, `deliveryMethodForState`) that do
 * not exist in a bare node environment. `list()` happens to use none of them,
 * which is why this runs without Nuxt. If it ever does, this file fails with a
 * `ReferenceError` rather than a wrong answer — and the DB counterpart still
 * covers the semantics.
 */

const JEWELRY: ProductCategory[] = [
  "rings",
  "necklaces",
  "earrings",
  "bracelets",
];

/** Big enough that pagination never hides a row from the count assertions. */
const ALL: ProductFilters = { perPage: 500 };

const list = (filters: ProductFilters) =>
  mockProductsRepo.list({ ...ALL, ...filters });

const countIn = (categories: readonly ProductCategory[]) =>
  MOCK_PRODUCTS.filter((p) => categories.includes(p.category)).length;

beforeAll(() => {
  mockConfig.minLatencyMs = 0;
  mockConfig.maxLatencyMs = 0;
  mockConfig.failureRate = 0;
});

describe("ProductFilters.categories", () => {
  it("narrows to the union of the categories given", async () => {
    const page = await list({ categories: JEWELRY });

    expect(page.total).toBe(countIn(JEWELRY));
    expect(page.items.every((p) => JEWELRY.includes(p.category))).toBe(true);
  });

  it("excludes every watch from a jewelry collection", async () => {
    const page = await list({ categories: JEWELRY });
    const watchSlugs = MOCK_PRODUCTS.filter((p) => p.category === "watches").map(
      (p) => p.slug,
    );

    expect(watchSlugs.length).toBeGreaterThan(0);
    for (const slug of watchSlugs) {
      expect(page.items.map((p) => p.slug)).not.toContain(slug);
    }
    // The reported total reflects the filter, not the table. This is the
    // assertion the original bug would have failed.
    expect(page.total).toBeLessThan(MOCK_PRODUCTS.length);
    expect(page.total).toBe(MOCK_PRODUCTS.length - watchSlugs.length);
  });

  it("narrows nothing when `categories` is empty", async () => {
    const unfiltered = await list({});
    const empty = await list({ categories: [] });

    expect(empty.total).toBe(MOCK_PRODUCTS.length);
    expect(empty.total).toBe(unfiltered.total);
    // Load-bearing: the tag-driven collections (Moissanite, Gifts) cut across
    // every category and pass `categories: []` with a `tag` instead. Treating
    // an empty array as `category IN ()` would empty those pages.
    expect(new Set(empty.items.map((p) => p.category)).size).toBeGreaterThan(1);
  });

  it("narrows nothing when both are absent", async () => {
    const page = await list({});
    expect(page.total).toBe(MOCK_PRODUCTS.length);
  });

  it("lets `category` win over a contradictory `categories`", async () => {
    const page = await list({ category: "watches", categories: ["rings"] });

    expect(page.total).toBe(countIn(["watches"]));
    expect(page.items.every((p) => p.category === "watches")).toBe(true);
    expect(page.items.some((p) => p.category === "rings")).toBe(false);
  });

  it("still handles the single-category case on its own", async () => {
    const page = await list({ category: "rings" });

    expect(page.total).toBe(countIn(["rings"]));
    expect(page.items.every((p) => p.category === "rings")).toBe(true);
  });

  it("combines with a tag rather than replacing it", async () => {
    const tagged = await list({ categories: JEWELRY, tag: "moissanite" });
    const expected = MOCK_PRODUCTS.filter(
      (p) => JEWELRY.includes(p.category) && p.tags.includes("moissanite"),
    ).length;

    expect(tagged.total).toBe(expected);
    expect(
      tagged.items.every(
        (p) => JEWELRY.includes(p.category) && p.tags.includes("moissanite"),
      ),
    ).toBe(true);
  });

  it("returns an empty page for a category with nothing in it, rather than everything", async () => {
    // A category the union cannot match: the guard is that a *narrowing* miss
    // is empty, while an *absent* filter is the whole table. Those two must
    // never be the same answer.
    const page = await list({ categories: JEWELRY, tag: "limited", maxPrice: 1 });
    expect(page.total).toBe(0);
    expect(page.items).toEqual([]);
  });
});
