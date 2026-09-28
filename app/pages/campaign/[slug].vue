<template>
  <main class="camp">
    <section class="camp__hero">
      <div class="camp__frame">
        <NuxtImg
          :src="campaign.heroImage"
          :alt="campaign.eyebrow"
          width="1400"
          height="1750"
          sizes="xs:100vw sm:100vw md:100vw lg:100vw xl:100vw"
          preload
          fetchpriority="high"
          decoding="async"
          class="camp__img"
        />
      </div>

      <div class="camp__veil" />
      <div class="inset-frame camp__inset" />

      <div class="camp__corners section-shell">
        <span class="mono-meta camp__corner">{{ campaign.code }}</span>
        <span class="mono-meta camp__corner">{{ campaign.dates }}</span>
      </div>

      <div class="camp__body section-shell">
        <div class="camp__stack">
          <p class="eyebrow camp__eyebrow">{{ campaign.eyebrow }}</p>
          <h1 class="display-heading camp__title">{{ campaign.title }}</h1>
          <p class="camp__intro">{{ campaign.intro }}</p>
        </div>
      </div>
    </section>

    <AppContainer as="section" class="camp__edit">
      <div class="camp__head">
        <span class="mono-meta">The edit</span>
        <span class="mono-meta">{{ count }} pieces</span>
      </div>

      <p v-if="isError" class="camp__error">
        The edit could not be loaded just now. Please refresh.
      </p>

      <AppEmptyState
        v-else-if="!products.length"
        title="Nothing here yet."
        message="This edit is being assembled. The collection is open in the meantime."
      >
        <AppButton to="/watches" variant="outline" size="sm">
          Browse the collection
        </AppButton>
      </AppEmptyState>

      <ShopProductGrid
        v-else
        :products="products"
        wide-every-fifth
        :show-quick-view="false"
      />
    </AppContainer>

    <AppContainer as="section" class="camp__note-shell">
      <div class="luxe-card camp__note">
        <h2 class="display-heading camp__note-title">{{ campaign.note.title }}</h2>
        <p class="camp__note-body">{{ campaign.note.body }}</p>
      </div>
    </AppContainer>

    <nav class="rail camp__rail" aria-label="Other campaigns">
      <NuxtLink
        v-for="other in others"
        :key="other.slug"
        class="chip camp__chip"
        :to="`/campaign/${other.slug}`"
      >
        {{ other.eyebrow }}
      </NuxtLink>
    </nav>
  </main>
</template>

<script setup lang="ts">
import { CAMPAIGN_PAGE_SIZE, campaignBySlug, otherCampaigns } from "~/utils/constants/campaigns";

/**
 * One editorial campaign.
 *
 * A campaign is merchandising, not a catalogue dimension: the copy and the
 * hero frame come from `constants/campaigns.ts`, and the edit itself is a
 * `ProductFilters` slice resolved through the normal catalogue query — so the
 * page stays correct as stock moves.
 */
// One component instance per campaign. Setup then resolves the slug once —
// including the 404 — and the hero replays its settle when a visitor moves
// between campaigns from the rail at the foot.
definePageMeta({ key: (route) => route.fullPath });

const route = useRoute();

const slug = String(route.params.slug ?? "");

const campaign = campaignBySlug(slug);
if (!campaign) {
  throw createError({ statusCode: 404, statusMessage: "Campaign not found" });
}

const others = otherCampaigns(slug);

const { data, isError, suspense } = useProductsQuery({
  ...campaign.filters,
  page: 1,
  perPage: CAMPAIGN_PAGE_SIZE,
});

// The edit is the substance of the page — server-rendered, not swapped in.
await suspense();

const products = computed(() => data.value?.items ?? []);
const count = computed(() => data.value?.total ?? 0);

usePageSeo({
  title: `${campaign.eyebrow} — ${campaign.title}`,
  description: campaign.intro,
  path: `/campaign/${slug}`,
  ogType: "article",
  ogImage: {
    card: "Campaign",
    props: {
      pill: campaign.code,
      title: campaign.title,
      description: campaign.intro,
      image: campaign.heroImage,
    },
  },
  jsonLd: breadcrumbSchema([
    { name: campaign.eyebrow, path: `/campaign/${slug}` },
  ]),
});
</script>

<style scoped>
.camp {
  padding-bottom: 64px;
}

/* ── Hero ──────────────────────────────────────────────────────────── */

.camp__hero {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  height: 620px;
  /* Runs under the glass header — 56px is the header's height. */
  margin-top: -56px;
  padding-bottom: 36px;
  overflow: hidden;
}

.camp__frame {
  position: absolute;
  inset: 0;
  animation: jbScale var(--dur-hero) var(--ease-brand) both;
}

.camp__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.camp__veil {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--color-obsidian) 30%, transparent) 0%,
    transparent 35%,
    var(--surface) 100%
  );
}

.camp__inset {
  inset: 68px 12px 12px;
}

.camp__corners {
  position: absolute;
  top: 72px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.camp__corner {
  letter-spacing: 0.08em;
  color: color-mix(in srgb, var(--color-bone) 75%, transparent);
}

.camp__body {
  position: relative;
}

.camp__stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 560px;
}

.camp__eyebrow {
  margin: 0;
  animation: jbRise var(--dur-hero) var(--ease-brand) 300ms both;
}

.camp__title {
  margin: 0;
  font-size: clamp(38px, 5.2vw, 50px);
  line-height: 0.98;
  text-wrap: balance;
  animation: jbRise var(--dur-hero) var(--ease-brand) 450ms both;
}

.camp__intro {
  margin: 0;
  font-size: 14px;
  line-height: 1.55;
  color: var(--text-secondary);
  animation: jbRise var(--dur-hero) var(--ease-brand) 600ms both;
}

/* ── The edit ──────────────────────────────────────────────────────── */

.camp__edit {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding-top: 40px;
}

.camp__head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.camp__error {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-secondary);
}

/* ── Note ──────────────────────────────────────────────────────────── */

.camp__note-shell {
  padding-top: 48px;
}

.camp__note {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 28px 22px;
}

.camp__note-title {
  margin: 0;
  font-size: 26px;
  line-height: 1.15;
}

.camp__note-body {
  max-width: 62ch;
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-secondary);
}

/* ── Other campaigns ───────────────────────────────────────────────── */

/* Full-bleed, so it restates `.section-shell`'s gutter. */
.camp__rail {
  gap: 6px;
  padding-block: 24px 0;
  padding-inline: calc(max(0px, (100% - 1280px) / 2) + 20px);
}

.camp__chip {
  font-size: 10px;
  letter-spacing: 0.1em;
  text-decoration: none;
}

@media (min-width: 768px) {
  .camp__hero {
    height: min(620px, 88vh);
    min-height: 540px;
    padding-bottom: 56px;
  }

  .camp__edit {
    padding-top: 56px;
  }

  .camp__note {
    padding: 44px 40px;
  }

  .camp__rail {
    padding-inline: calc(max(0px, (100% - 1280px) / 2) + 32px);
  }
}

@media (min-width: 1024px) {
  .camp__rail {
    padding-inline: calc(max(0px, (100% - 1280px) / 2) + 48px);
  }
}
</style>
