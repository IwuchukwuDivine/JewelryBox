import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { scope, uniq, type ProductRow, type Scope } from "./helpers/fixtures";
import { anonClient, service } from "./helpers/supabase";
import type { ProductCategory } from "~/utils/types/shop";

/**
 * `ProductFilters.categories` against real rows.
 *
 * A nav collection such as Jewelry spans four categories. Before `categories`
 * existed there was no way to say that, so `/jewelry` applied no category
 * filter at all and served the whole catalogue — watches included — under a
 * top-level nav item. Nothing threw and nothing was empty. The failure mode is
 * returning **too much**, so every assertion here is a count or a membership
 * check; "did it come back" would have passed for the entire life of the bug.
 *
 * This tests the PostgREST behaviour directly rather than importing
 * `app/utils/api/products.ts`, which another lane still owns. What it pins is
 * the contract that module has to satisfy — in particular the one case that is
 * not expressible as a filter at all: an empty `categories` array must be
 * dropped by the caller, because `in.()` narrows to nothing rather than to
 * everything.
 */

const JEWELRY: ProductCategory[] = ["rings", "necklaces", "earrings", "bracelets"];
const ALL: ProductCategory[] = ["watches", ...JEWELRY];

let fx: Scope;
let marker: string;
let created: Record<string, ProductRow> = {};
const anon = anonClient();

/** Scoped to this run's rows via `brand`, so the shared catalogue cannot skew a count. */
const query = () => anon.from("products").select("slug, category", { count: "exact" }).eq("brand", marker);

interface Row {
  slug: string;
  category: string;
}

beforeAll(async () => {
  fx = scope();
  marker = `jb-test-filters-${uniq()}`;
  created = {};
  for (const category of ALL) {
    created[category] = await fx.product({ category, brand: marker });
  }
});

afterAll(async () => {
  await fx.destroy();
});

describe("category narrowing", () => {
  it("returns every piece when nothing narrows it", async () => {
    const { data, count, error } = await query();

    expect(error).toBeNull();
    expect(count).toBe(ALL.length);
    expect((data as Row[]).map((r) => r.category).sort()).toEqual([...ALL].sort());
  });

  it("narrows to the union of several categories and excludes the rest", async () => {
    const { data, count, error } = await query().in("category", JEWELRY);

    expect(error).toBeNull();
    expect(count).toBe(JEWELRY.length);

    const slugs = (data as Row[]).map((r) => r.slug);
    // The watch is gone, and the reported total reflects the filter rather than
    // the table. This is the assertion the original bug failed.
    expect(slugs).not.toContain(created.watches!.slug);
    expect(count).toBeLessThan(ALL.length);
    expect(
      (data as Row[]).every((r) => JEWELRY.includes(r.category as ProductCategory)),
    ).toBe(true);
  });

  it("narrows to one category on its own", async () => {
    const { data, count, error } = await query().eq("category", "watches");

    expect(error).toBeNull();
    expect(count).toBe(1);
    expect((data as Row[])[0]!.slug).toBe(created.watches!.slug);
  });

  /**
   * The case a repository has to special-case.
   *
   * `categories: []` means "no category narrowing" — the tag-driven
   * collections (Moissanite, Gifts) cut across every category and rely on it.
   * But `in.()` with no values matches nothing, so a repository that passes an
   * empty array straight through empties those pages. The filter must be
   * omitted, not passed empty.
   */
  it("matches nothing when an empty list is passed to `in`, which is why the caller must omit it", async () => {
    const { count, error } = await query().in("category", []);

    expect(error).toBeNull();
    expect(count).toBe(0);

    // And omitting it is what "no narrowing" actually looks like.
    const omitted = await query();
    expect(omitted.count).toBe(ALL.length);
  });

  /**
   * `category` wins when both are present, per the type's own comment — which
   * means a repository must apply one filter or the other, never both. Applied
   * together they intersect, and a contradictory pair then yields nothing at
   * all instead of the single category asked for.
   */
  it("gives the single category when `category` contradicts `categories`", async () => {
    // What the contract requires: `category` alone.
    const wins = await query().eq("category", "watches");
    expect(wins.count).toBe(1);
    expect((wins.data as Row[])[0]!.category).toBe("watches");

    // What applying both would produce — the wrong answer, pinned here so the
    // difference is visible rather than a matter of reading the implementation.
    const both = await query().eq("category", "watches").in("category", ["rings"]);
    expect(both.count).toBe(0);
  });

  it("combines a category union with a tag filter", async () => {
    const tagged = await fx.product({
      category: "rings",
      brand: marker,
      tags: ["moissanite"],
    });

    const { data, count, error } = await query()
      .in("category", JEWELRY)
      .contains("tags", ["moissanite"]);

    expect(error).toBeNull();
    expect(count).toBe(1);
    expect((data as Row[])[0]!.slug).toBe(tagged.slug);
  });

  it("keeps an archived piece out of every filtered result", async () => {
    // Baseline first, so this does not depend on how many rows earlier cases
    // happened to add.
    const baseline = (await query().in("category", JEWELRY)).count;
    const doomed = await fx.product({ category: "rings", brand: marker });
    await service()
      .from("products")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", doomed.id);

    const { data, count } = await query().in("category", JEWELRY);
    expect((data as Row[]).map((r) => r.slug)).not.toContain(doomed.slug);
    // Soft delete lives in the RLS policy, so the archived row never reaches
    // the public reader and the count is unchanged — the repository does not
    // have to remember.
    expect(count).toBe(baseline);
  });
});
