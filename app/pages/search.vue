<template>
  <AppContainer as="section" class="search-page">
    <ShopSearchPanel
      v-model="query"
      autofocus
      @search="syncQuery"
      @navigate="remember"
    />
  </AppContainer>
</template>

<script setup lang="ts">
/**
 * `/search` — the same panel the header overlay renders, on its own route.
 *
 * The route exists so a search can be linked, shared and reloaded; the
 * overlay exists so it never has to be. Both mount `ShopSearchPanel`, so
 * there is exactly one search UI in the codebase.
 *
 * `?q=` is mirrored with `replace`, not `push`: a search is one destination,
 * not one history entry per keystroke.
 */
const route = useRoute();
const router = useRouter();

const query = ref(String(route.query.q ?? ""));

const syncQuery = (value: string) => {
  const next = filtersToQuery({ q: value });
  if ((route.query.q ?? "") === (next.q ?? "")) return;
  router.replace({ path: "/search", query: next });
};

/* Following a result should leave the URL holding what was searched. */
const remember = () => {
  syncQuery(query.value);
};

/** Back and forward through searches keep the field honest. */
watch(
  () => route.query.q,
  (value) => {
    const next = String(value ?? "");
    if (next !== query.value) query.value = next;
  },
);

usePageSeo({
  title: "Search",
  description:
    "Search the house — wristwatches, rings, necklaces, earrings, bracelets and moissanite, certified and insured across Nigeria.",
  path: "/search",
  /* Also in sitemap.exclude and robots.txt; this is the on-page half. */
  robots: "noindex, follow",
  ogImage: false,
});
</script>

<style scoped>
.search-page {
  display: flex;
  flex-direction: column;
  min-height: 70dvh;
  padding-bottom: 64px;
}
</style>
