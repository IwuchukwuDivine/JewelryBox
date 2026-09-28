<template>
  <AppContainer as="main" narrow class="faq">
    <ContentPageHeader eyebrow="Client care" title="Questions, answered." />

    <div class="faq__chips" role="group" aria-label="Question categories">
      <AppChip
        v-for="category in FAQ_CATEGORIES"
        :key="category.slug"
        :active="category.slug === activeSlug"
        @click="pick(category.slug)"
      >
        {{ category.label }}
      </AppChip>
    </div>

    <AppAccordion :key="activeSlug" v-model="openValue" class="faq__list">
      <AppAccordionItem
        v-for="(entry, index) in entries"
        :key="`${activeSlug}-${index}`"
        :value="`${activeSlug}-${index}`"
        :title="entry.question"
      >
        {{ entry.answer }}
      </AppAccordionItem>
    </AppAccordion>

    <ContentCallout
      text="Still unsure? A specialist replies within the hour."
      action-label="Contact"
      to="/contact"
    />
  </AppContainer>
</template>

<script setup lang="ts">
/**
 * Client care, by category.
 *
 * Chips switch category and the first answer of the new one opens, matching
 * the prototype (`faqOpen: 0` on every pick). The category also rides the
 * query string, so a specialist can send someone to `/faq?c=delivery`.
 *
 * `FAQ_CATEGORIES` is the single source for these answers — see
 * app/utils/constants/faq.ts for why each is worded the way it is.
 */
const route = useRoute();

const [firstCategory] = FAQ_CATEGORIES;
const fallbackSlug = firstCategory?.slug ?? "orders";

const resolveSlug = (value: unknown): string => {
  const slug = typeof value === "string" ? value : "";
  return faqCategoryBySlug(slug)?.slug ?? fallbackSlug;
};

const activeSlug = ref(resolveSlug(route.query.c));

const entries = computed(
  () => (faqCategoryBySlug(activeSlug.value) ?? firstCategory)?.entries ?? [],
);

/** First item open, as the prototype does. */
const openValue = ref<string | string[] | null>(`${activeSlug.value}-0`);

const pick = (slug: string) => {
  activeSlug.value = slug;
  openValue.value = `${slug}-0`;
  // Shareable, and Back returns to the category the reader came from.
  void navigateTo({
    path: "/faq",
    query: slug === fallbackSlug ? {} : { c: slug },
  });
};

// A Back or Forward navigation has to move the chips with it.
watch(
  () => route.query.c,
  (value) => {
    const slug = resolveSlug(value);
    if (slug === activeSlug.value) return;
    activeSlug.value = slug;
    openValue.value = `${slug}-0`;
  },
);

usePageSeo({
  title: "Frequently Asked Questions",
  description:
    "Delivery, payment, returns, warranty and care — how buying from JewelryBox actually works, answered in full.",
  path: "/faq",
  // Every answer, not only the open category: the page ships all nine and the
  // chips just filter what is on screen, so one crawl should see the lot.
  jsonLd: [
    faqSchema([...FAQ_ENTRIES]),
    breadcrumbSchema([{ name: "FAQ", path: "/faq" }]),
  ],
});
</script>

<style scoped>
.faq {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding-block: 24px 64px;
}

/* Scrolls rather than wraps: nine categories will not fit a 390px canvas. */
.faq__chips {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
  /* Room for the chip focus ring, pulled back so the row still lines up. */
  padding: 2px;
  margin: -2px;
}

.faq__chips::-webkit-scrollbar {
  display: none;
}

.faq__list {
  border-top: 1px solid var(--border-default);
  animation: jbRise var(--dur-reveal) var(--ease-brand) both;
}

@media (min-width: 768px) {
  .faq {
    gap: 32px;
  }

  .faq__chips {
    flex-wrap: wrap;
    overflow-x: visible;
  }
}
</style>
