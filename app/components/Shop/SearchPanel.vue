<template>
  <div class="search-panel">
    <div class="search-panel__head">
      <AppSearchBar
        class="search-panel__field"
        :model-value="modelValue"
        placeholder="Search watches, rings, moissanite…"
        :autofocus="autofocus"
        @update:model-value="emit('update:modelValue', $event)"
        @search="onSearch"
      />

      <button
        v-if="dismissible"
        type="button"
        class="icon-btn search-panel__close"
        aria-label="Close search"
        @click="emit('close')"
      >
        <lucide-x :size="20" :stroke-width="1.4" />
      </button>
    </div>

    <!-- The rule draws itself in accent while a query stands. -->
    <div class="search-panel__rule">
      <span
        class="search-panel__rule-fill"
        :class="{ 'search-panel__rule-fill--drawn': typing }"
        aria-hidden="true"
      />
    </div>

    <!-- ── Results ──────────────────────────────────────────────────── -->
    <div v-if="typing" class="search-panel__body search-panel__body--results">
      <section v-if="matchedCategories.length" class="search-panel__block">
        <p class="mono-meta search-panel__heading">Categories</p>

        <NuxtLink
          v-for="entry in matchedCategories"
          :key="entry.slug"
          class="list-row search-panel__row"
          :to="`/${entry.slug}`"
          @click="commit"
        >
          <span class="display-heading search-panel__row-label">{{ entry.label }}</span>
          <span class="search-panel__arrow" aria-hidden="true">→</span>
        </NuxtLink>
      </section>

      <section class="search-panel__block">
        <p class="mono-meta search-panel__heading" aria-live="polite">
          {{ results.length }} {{ results.length === 1 ? "piece" : "pieces" }}
        </p>

        <div v-if="isPending" class="search-panel__pending">
          <AppSpinner size="80px" label="Searching" />
        </div>

        <AppEmptyState
          v-else-if="!results.length"
          title="Nothing matches that."
          message="Try a metal, a stone or a category — gold, moissanite, automatic."
        />

        <div v-else class="search-panel__results">
          <NuxtLink
            v-for="product in results"
            :key="product.id"
            class="search-panel__result"
            :to="`/product/${product.slug}`"
            @click="commit"
          >
            <NuxtImg
              :src="product.images[0]"
              :alt="product.name"
              class="search-panel__result-image"
              width="112"
              height="128"
              sizes="56px"
              loading="lazy"
            />

            <span class="search-panel__result-text">
              <span class="mono-meta">{{ product.brand }}</span>
              <span class="search-panel__result-name">{{ product.name }}</span>
            </span>

            <span class="price search-panel__result-price">
              {{ formatPrice(product.price_ngn) }}
            </span>
          </NuxtLink>
        </div>
      </section>
    </div>

    <!-- ── Nothing typed yet ────────────────────────────────────────── -->
    <div v-else class="search-panel__body">
      <section class="search-panel__block search-panel__block--chips">
        <p class="mono-meta search-panel__heading">Trending</p>

        <div class="search-panel__chips">
          <button
            v-for="suggestion in TRENDING"
            :key="suggestion"
            type="button"
            class="chip search-panel__chip"
            @click="seed(suggestion)"
          >
            {{ suggestion }}
          </button>
        </div>
      </section>

      <section v-if="recent.length" class="search-panel__block search-panel__block--chips">
        <p class="mono-meta search-panel__heading">Recent</p>

        <div class="search-panel__chips">
          <button
            v-for="suggestion in recent"
            :key="suggestion"
            type="button"
            class="chip search-panel__chip"
            @click="seed(suggestion)"
          >
            {{ suggestion }}
          </button>
        </div>
      </section>

      <section class="search-panel__block">
        <p class="mono-meta search-panel__heading">Popular</p>

        <NuxtLink
          v-for="entry in popular"
          :key="entry.slug"
          class="list-row search-panel__row"
          :to="`/${entry.slug}`"
          @click="emit('navigate')"
        >
          <span class="display-heading search-panel__row-label">{{ entry.label }}</span>
          <span class="mono-meta">{{ entry.count }}</span>
        </NuxtLink>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Product } from "~/utils/types/shop";

/**
 * The search surface itself — shared verbatim by the header overlay
 * (`ShopSearchOverlay`) and the `/search` route, so the two can never drift.
 *
 * The magnifier lives inside `AppSearchBar`, which also owns the debounce:
 * its `search` event is what actually moves the query, so typing does not
 * fire a request per keystroke.
 *
 * Two states, exactly as the prototype draws them — trending / recent /
 * popular before anything is typed, then categories, a count and the result
 * rows once something is.
 */
const props = withDefaults(
  defineProps<{
    modelValue: string;
    autofocus?: boolean;
    /** Show the close cross. True in the overlay, false on the route. */
    dismissible?: boolean;
    limit?: number;
  }>(),
  { autofocus: false, dismissible: false, limit: 12 },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
  /** The debounced term — the page mirrors it into `?q=`. */
  search: [value: string];
  /** The close cross. */
  close: [];
  /** A row was followed; the overlay uses this to get out of the way. */
  navigate: [];
}>();

const TRENDING = ["gold", "moissanite", "automatic", "studs", "tennis bracelet"] as const;
const MAX_RECENT = 4;

/** Shared across the overlay and the route, so one remembers the other. */
const recent = useState<string[]>("search-recent", () => []);

/** What is actually queried — settled, not per keystroke. */
const term = ref(props.modelValue);

/** What is on screen — drives the rule and which half of the panel shows. */
const typing = computed(() => props.modelValue.trim().length > 0);

watch(
  () => props.modelValue,
  (value) => {
    /* Clearing the field should empty the panel at once, not in 350ms. */
    if (!value.trim()) term.value = "";
  },
);

const onSearch = (value: string) => {
  term.value = value;
  emit("search", value);
};

/** A trending or recent chip: fill the field and search immediately. */
const seed = (value: string) => {
  emit("update:modelValue", value);
  term.value = value;
  emit("search", value);
};

/** Remember a term only once it took someone somewhere. */
const commit = () => {
  const value = term.value.trim();
  if (value) {
    recent.value = [value, ...recent.value.filter((item) => item !== value)].slice(
      0,
      MAX_RECENT,
    );
  }
  emit("navigate");
};

const { data, isPending } = useProductSearchQuery(
  () => term.value,
  () => props.limit,
);

const results = computed<Product[]>(() => (term.value.trim() ? (data.value ?? []) : []));

/** The categories the matches fall into, best first, three at most. */
const matchedCategories = computed(() => {
  const seen: string[] = [];
  for (const product of results.value) {
    if (!seen.includes(product.category)) seen.push(product.category);
  }
  return seen
    .map((value) => categoryByValue(value as Product["category"]))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .slice(0, 3)
    .map((entry) => ({ slug: entry.slug, label: entry.plural }));
});

/* ── Popular, with live counts ─────────────────────────────────────────── */

const POPULAR: { label: string; slug: string; match: (product: Product) => boolean }[] = [
  { label: "Watches", slug: "watches", match: (p) => p.category === "watches" },
  { label: "Rings", slug: "rings", match: (p) => p.category === "rings" },
  { label: "Necklaces", slug: "necklaces", match: (p) => p.category === "necklaces" },
  { label: "Earrings", slug: "earrings", match: (p) => p.category === "earrings" },
  { label: "Gifts", slug: "gifts", match: (p) => p.tags.includes("gift") },
];

/* One read of the catalogue, counted five ways — the repository has no
   count-by-category call, and five paged requests for five numbers is worse. */
const { data: catalogue } = useProductsQuery(() => ({ page: 1, perPage: 500 }));

const popular = computed(() => {
  const items = catalogue.value?.items ?? [];
  return POPULAR.map((entry) => ({
    label: entry.label,
    slug: entry.slug,
    count: items.filter(entry.match).length,
  }));
});
</script>

<style scoped>
.search-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.search-panel__head {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 56px;
}

.search-panel__field {
  flex: 1;
  min-width: 0;
}

.search-panel__field :deep(.app-searchbar__input) {
  font-size: 17px;
}

.search-panel__close {
  flex: 0 0 auto;
  margin-right: -12px;
}

.search-panel__rule {
  position: relative;
  height: 1px;
  background: var(--border-default);
}

.search-panel__rule-fill {
  position: absolute;
  inset: 0 auto 0 0;
  width: 0;
  background: var(--accent);
  transition: width 0.5s var(--ease-brand);
}

.search-panel__rule-fill--drawn {
  width: 100%;
}

.search-panel__body {
  display: flex;
  flex-direction: column;
  gap: 28px;
  padding-top: 28px;
}

.search-panel__body--results {
  gap: 22px;
  padding-top: 24px;
  animation: jbRise var(--dur-reveal) var(--ease-brand) both;
}

.search-panel__block {
  display: flex;
  flex-direction: column;
}

.search-panel__block--chips {
  gap: 10px;
}

.search-panel__heading {
  margin: 0;
  padding-bottom: 8px;
  letter-spacing: 0.14em;
}

.search-panel__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.search-panel__chip {
  text-transform: none;
  letter-spacing: 0.04em;
  font-size: 12px;
}

.search-panel__row-label {
  font-size: 20px;
}

.search-panel__arrow {
  color: var(--text-secondary);
}

.search-panel__pending {
  display: flex;
  justify-content: center;
  padding: 24px 0;
}

.search-panel__results {
  display: flex;
  flex-direction: column;
}

.search-panel__result {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 0;
  color: var(--text-primary);
  text-decoration: none;
  transition: opacity var(--dur-hover) var(--ease-brand);
}

.search-panel__result:hover {
  opacity: 0.7;
}

.search-panel__result-image {
  flex: 0 0 auto;
  width: 56px;
  height: 64px;
  object-fit: cover;
  border: 1px solid var(--border-default);
}

.search-panel__result-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.search-panel__result-name {
  font-size: 15px;
  line-height: 1.3;
}

.search-panel__result-price {
  font-size: 13px;
}

@media (min-width: 1024px) {
  .search-panel__result-image {
    width: 64px;
    height: 74px;
  }
}
</style>
