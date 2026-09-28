<template>
  <div class="collection">
    <!-- ── Hero ─────────────────────────────────────────────────────── -->
    <section class="collection__hero">
      <NuxtImg
        :src="heroSrc"
        alt=""
        class="collection__hero-image"
        width="1280"
        height="600"
        sizes="xs:100vw sm:100vw md:100vw lg:100vw xl:100vw"
        preload
        fetchpriority="high"
      />

      <div class="collection__hero-veil" aria-hidden="true" />

      <div class="collection__hero-copy">
        <p class="eyebrow collection__eyebrow">{{ headline }}</p>
        <h1 class="display-heading collection__title">{{ heading }}</h1>
        <p class="collection__intro">{{ description }}</p>
      </div>
    </section>

    <!-- ── Sticky filter bar ────────────────────────────────────────── -->
    <ShopFilterBar
      :filter="activeChip"
      :sort="activeSort"
      :total="total"
      @update:filter="setFilter"
      @update:sort="setSort"
    />

    <!-- ── Rail + grid ──────────────────────────────────────────────── -->
    <div class="section-shell collection__layout">
      <ShopFilterRail
        class="collection__rail"
        :filter="activeChip"
        :sort="activeSort"
        @update:filter="setFilter"
        @update:sort="setSort"
      />

      <div class="collection__results">
        <AppEmptyState
          v-if="!isPending && !products.length"
          title="Nothing here yet."
          message="No piece in this collection matches that. Clear the filters and the whole edit comes back."
        >
          <AppButton variant="outline" @click="clearFilters">Clear filters</AppButton>
        </AppEmptyState>

        <ShopProductGrid
          v-else
          :products="products"
          :loading="isPending"
          wide-every-fifth
          show-quick-view
          @quick-view="openQuickView"
        />

        <AppPagination
          v-if="totalPages > 1"
          class="collection__pager"
          :page="currentPage"
          :total-pages="totalPages"
          @update:page="setPage"
        />
      </div>
    </div>

    <ClientOnly>
      <ShopRecentlyViewed class="collection__recent" />
    </ClientOnly>

    <ShopQuickView v-model="quickViewOpen" :product="quickViewProduct" />
  </div>
</template>

<script setup lang="ts">
import type { Product, ProductFilter, ProductFilters, ProductSort } from "~/utils/types/shop";

/**
 * `/[category]` — the collection grid.
 *
 * A catch-all that must answer BOTH of the storefront's vocabularies, in
 * this order:
 *
 *   1. `collectionBySlug` — the four nav entries (watches · jewelry ·
 *      moissanite · gifts). These are merchandising groupings and win ties.
 *   2. `categoryBySlug`   — the five product categories (watches · rings ·
 *      necklaces · earrings · bracelets).
 *   3. neither            — 404.
 *
 * `watches` exists in both; the collection wins, which is why the lookup is
 * ordered rather than merged. Static routes (`/cart`, `/search`, `/about`)
 * are matched by Nuxt before this file, so nothing needs excluding.
 *
 * FILTER STATE IS THE ROUTE. There is no filter store: the query is read
 * with `filtersFromQuery` and written with `filtersToQuery`, which drops
 * every default so `/watches` never decays into
 * `/watches?filter=all&sort=newest&page=1`.
 */
const route = useRoute();
const router = useRouter();
const { track } = useTag();

const slug = computed(() => String(route.params.category ?? ""));

const collection = computed(() => collectionBySlug(slug.value));
const category = computed(() => categoryBySlug(slug.value));

if (!collection.value && !category.value) {
  throw createError({ statusCode: 404, statusMessage: "Collection not found" });
}

/* ── Copy ─────────────────────────────────────────────────────────────── */

/** The page's own name — plural for a category, the label for a collection. */
const heading = computed(() => category.value?.plural ?? collection.value?.label ?? "");
const headline = computed(() => category.value?.headline ?? collection.value?.headline ?? "");
const description = computed(
  () => category.value?.description ?? collection.value?.description ?? "",
);

/* ── Data ─────────────────────────────────────────────────────────────── */

/** What the ROUTE fixed, before anything the shopper chose. */
const base = computed<Partial<ProductFilters>>(() => {
  const asCollection = collection.value;
  if (asCollection) {
    return collectionFilters({
      categories: asCollection.categories,
      tag: asCollection.tag,
    });
  }
  return categoryFilters(category.value!.value);
});

const filters = computed(() => filtersFromQuery(route.query, base.value));

const { data, isPending, suspense } = useProductsQuery(filters);

/* Resolved on the server so the count, the grid and the JSON-LD item list
   are all real in the first response — the grid is this page's LCP. */
await suspense().catch(() => undefined);

const products = computed<Product[]>(() => data.value?.items ?? []);
const total = computed(() => data.value?.total ?? 0);
const totalPages = computed(() => data.value?.totalPages ?? 1);
const currentPage = computed(() => data.value?.page ?? filters.value.page ?? 1);

/* ── Hero art ─────────────────────────────────────────────────────────── */

/**
 * NOT `CategoryDefinition.heroImage`.
 *
 * That field points at `/images/categories/*.jpg`, which is where real
 * photography will live once it lands in Supabase storage at Phase F. No
 * such file is in this repo — the catalogue is deliberately weightless and
 * runs on the verified Unsplash pool — so reading it today yields a 404.
 * The constant stays as it is; this call site uses the same pool the home
 * page's category tiles use, and swaps back at Phase F.
 *
 * A collection borrows the pool of its lead category; the two tag-driven
 * collections (moissanite, gifts) have no lead, so they take an editorial
 * frame instead.
 */
const heroSrc = computed(() => {
  const lead = category.value?.value ?? collection.value?.categories[0];
  const pool = lead ? PHOTOS[lead] : PHOTOS.editorial;
  return mockImage(pool[0]!, 1600);
});

/* ── Writing filters back to the route ────────────────────────────────── */

const activeChip = computed(() => activeFilterChip(route.query));
const activeSort = computed<ProductSort>(() => filters.value.sort ?? "newest");

const apply = (next: { filter?: ProductFilter; sort?: ProductSort; page?: number }) => {
  router.push({
    path: `/${slug.value}`,
    query: filtersToQuery({
      filter: next.filter ?? activeChip.value,
      sort: next.sort ?? activeSort.value,
      /* Narrowing the grid always returns to page one. */
      page: next.page ?? 1,
    }),
  });
};

const setFilter = (filter: ProductFilter) => {
  apply({ filter, page: 1 });
  track("filter_apply", { category: slug.value, filter });
};

const setSort = (sort: ProductSort) => apply({ sort, page: 1 });

const setPage = (page: number) => {
  apply({ page });
  scrollToTop();
};

const clearFilters = () => {
  router.push({ path: `/${slug.value}`, query: {} });
};

/* ── Quick view ───────────────────────────────────────────────────────── */

const quickViewOpen = ref(false);
const quickViewProduct = ref<Product | null>(null);

const openQuickView = (product: Product) => {
  quickViewProduct.value = product;
  quickViewOpen.value = true;
};

/* ── SEO ──────────────────────────────────────────────────────────────── */

const canonicalPath = computed(() => `/${slug.value}`);

usePageSeo({
  title: heading,
  description,
  /* Stays bare on purpose: a filtered grid is not its own canonical page. */
  path: canonicalPath,
  /* …and is not its own indexable page either. */
  robots: () => (hasActiveFilters(route.query) ? "noindex, follow" : "index, follow"),
  ogImage: {
    card: "Collection",
    props: {
      title: heading.value,
      pill: category.value
        ? `The ${category.value.label} Edit`
        : `The ${collection.value?.label} Collection`,
      description: description.value,
      count: total.value,
    },
  },
  jsonLd: () =>
    collectionSchema({
      name: heading.value,
      description: description.value,
      path: canonicalPath.value,
      items: products.value.map((product) => ({
        name: product.name,
        path: `/product/${product.slug}`,
      })),
    }),
});
</script>

<style scoped>
.collection {
  display: flex;
  flex-direction: column;
  padding-bottom: 80px;
}

/* ── Hero ───────────────────────────────────────────────────────────── */

.collection__hero {
  position: relative;
  height: 300px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 0 20px 24px;
}

.collection__hero-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  animation: jbScale var(--dur-hero) var(--ease-brand) both;
}

.collection__hero-veil {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(18, 16, 16, 0.2), var(--surface));
}

.collection__hero-copy {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 44ch;
}

/* The editorial line can run past one mono line; let it wrap properly. */
.collection__eyebrow {
  margin: 0;
  line-height: 1.5;
}

.collection__title {
  margin: 0;
  font-size: clamp(32px, 7vw, 44px);
  line-height: 1;
}

.collection__intro {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-secondary);
}

/* ── Layout ─────────────────────────────────────────────────────────── */

.collection__layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;
  padding-top: 20px;
}

.collection__rail {
  display: none;
}

.collection__results {
  min-width: 0;
}

.collection__pager {
  margin-top: 32px;
}

.collection__recent {
  padding-top: 56px;
}

@media (min-width: 1024px) {
  .collection__hero {
    height: 420px;
    padding-bottom: 40px;
  }

  .collection__layout {
    grid-template-columns: 240px minmax(0, 1fr);
    gap: 48px;
    padding-top: 32px;
  }

  .collection__rail {
    display: flex;
  }
}
</style>
