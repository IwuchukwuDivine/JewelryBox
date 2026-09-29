<template>
  <article class="pdp">
    <AppContainer as="div" class="pdp__crumbs">
      <AppBreadcrumbs :items="crumbs" />
    </AppContainer>

    <div class="pdp__layout">
      <!-- ── Gallery ──────────────────────────────────────────────────── -->
      <div class="pdp__gallery">
        <ShopImageGallery
          :images="piece.images"
          :alt="piece.name"
          :product-id="piece.id"
          :slug="piece.slug"
        />
      </div>

      <!-- ── Info column ──────────────────────────────────────────────── -->
      <div class="pdp__info">
        <section class="pdp__header">
          <div class="pdp__refs">
            <span class="mono-meta">{{ piece.brand }}</span>
            <span class="mono-meta">REF {{ reference }}</span>
          </div>

          <h1 class="display-heading pdp__name">{{ piece.name }}</h1>

          <div class="pdp__price-row">
            <span class="pdp__prices">
              <span v-if="piece.compare_at_ngn" class="price pdp__was">
                {{ formatPrice(piece.compare_at_ngn) }}
              </span>
              <span class="price pdp__price">{{ formatPrice(price) }}</span>
            </span>

            <span class="pdp__availability" :style="{ color: availabilityColour }">
              ● {{ availabilityLabel }}
            </span>
          </div>

          <p class="pdp__delivery">
            Insured delivery across Nigeria in 1–3 working days.
          </p>

          <p class="pdp__description">{{ piece.description }}</p>
        </section>

        <ShopVariantSelector
          v-if="variants.length"
          v-model="selectedVariantId"
          class="pdp__variants"
          :variants="variants"
        />

        <section class="pdp__specs">
          <ShopSpecTable :specs="piece.specs" />

          <p class="pdp__certificate">
            <span class="diamond diamond--filled pdp__certificate-mark" aria-hidden="true" />
            Every piece leaves the house with its certificate of authenticity and,
            where the stone is graded, its report. Serial and reference are recorded
            against your order.
          </p>
        </section>

        <!-- Fixed to the bottom of the viewport below lg; inline here at lg. -->
        <div class="glass-bar pdp__buybar">
          <div class="pdp__buybar-total">
            <span class="caption">Total</span>
            <span class="price pdp__buybar-price">{{ formatPrice(price) }}</span>
          </div>

          <AppButton
            class="pdp__buybar-add"
            variant="solid"
            :disabled="!purchasable"
            @click="addToBag"
          >
            Add to Bag
          </AppButton>

          <AppButton
            class="pdp__buybar-buy"
            variant="outline"
            :disabled="!purchasable"
            @click="buyNow"
          >
            Buy Now
          </AppButton>
        </div>

        <AppAccordion v-model="openSection" class="pdp__accordion">
          <AppAccordionItem value="details" title="The Details">
            <p>{{ piece.description }}</p>
            <p>
              Reference {{ reference }}, filed under {{ categoryLabel.toLowerCase() }}.
              The specification above is the piece as it ships — nothing is
              substituted between the photograph and the parcel.
            </p>
          </AppAccordionItem>

          <AppAccordionItem value="craft" title="Craftsmanship">
            <p>
              Assembled and finished by hand, then inspected a second time before
              it is boxed. Metal is solid, never plated over base; stones are set
              by a setter, not glued.
            </p>
            <p>
              Where a piece is made to order, it is cast for you and sized before
              dispatch, which is why it takes a little longer to arrive.
            </p>
          </AppAccordionItem>

          <AppAccordionItem value="receive" title="What You'll Receive">
            <p>
              The piece in its own box, the certificate of authenticity, the stone
              report where one applies, and a polishing cloth. Sealed, and boxed
              well enough to give exactly as it arrives.
            </p>
          </AppAccordionItem>

          <AppAccordionItem value="shipping" title="Shipping &amp; Delivery">
            <p>
              Lagos: 1–2 working days, by dispatch rider. The fee depends on the
              area and is shown at checkout.
            </p>
            <p>
              Every other state: 2–4 working days, by air freight, priced per
              state. Every parcel is insured for its full value in transit, and
              you are given the tracking the day it leaves.
            </p>
          </AppAccordionItem>

          <AppAccordionItem value="auth" title="Authenticity">
            <p>
              Nothing is listed here that the house has not held. Each piece is
              checked on arrival and again before dispatch, and the certificate
              travels with it.
            </p>
            <p>
              Moissanite is sold as moissanite and graded on the same colour scale
              as diamond — never described as something it is not.
            </p>
          </AppAccordionItem>

          <AppAccordionItem value="care" title="Care &amp; Warranty">
            <p>
              Keep it away from perfume, chlorine and the gym. Warm water, a soft
              brush and the cloth in the box will hold the finish for years.
            </p>
            <p>
              Twelve months against manufacturing fault from the day it is
              delivered. Servicing and resizing are available afterwards at cost.
            </p>
          </AppAccordionItem>
        </AppAccordion>
      </div>
    </div>

    <ShopRelatedProducts class="pdp__related" :slug="piece.slug" :limit="4" />

    <ClientOnly>
      <ShopRecentlyViewed class="pdp__recent" :exclude="piece.slug" />
    </ClientOnly>
  </article>
</template>

<script setup lang="ts">
import type { Availability, Product, ProductVariant } from "~/utils/types/shop";

/**
 * `/product/[slug]` — the product page.
 *
 * Resolved on the server: a slug that is not in the catalogue must 404
 * properly, not render an empty shell and then decide.
 *
 * Below `lg` this is one column with the buy bar fixed to the bottom of the
 * viewport, exactly as the prototype draws it. At `lg` it becomes
 * gallery-left / sticky-info-right and the same bar goes inline in the info
 * column — one element, two positions, so the two can never disagree.
 */
const route = useRoute();
const slug = computed(() => String(route.params.slug ?? ""));

const { data: product, suspense } = useProductQuery(slug);
await suspense().catch(() => undefined);

if (!product.value) {
  throw createError({ statusCode: 404, statusMessage: "Piece not found" });
}

/** Past the 404 guard the piece is known — this spares every read a `?.`. */
const piece = computed(() => product.value as Product);

const { add } = useCart();
const { record } = useRecentlyViewed();
const { track } = useTag();

/* ── Identity ─────────────────────────────────────────────────────────── */

const categoryLabel = computed(() => categoryByValue(piece.value.category)?.label ?? "Piece");

/**
 * The reference. Initials of the slug's words, then the numeric tail of the
 * id — `meridian-automatic-40` + `prd_001` → `MA-001`.
 */
const reference = computed(() => {
  const initials = piece.value.slug
    .split("-")
    .map((word) => word.charAt(0))
    .filter((char) => /[a-z]/i.test(char))
    .join("")
    .slice(0, 4)
    .toUpperCase();
  const tail = piece.value.id.replace(/\D/g, "").slice(-4).padStart(3, "0");
  return `${initials || "JB"}-${tail || "000"}`;
});

const crumbs = computed(() => [
  { label: "Home", to: "/" },
  {
    label: categoryByValue(piece.value.category)?.plural ?? "Collection",
    to: `/${categoryByValue(piece.value.category)?.slug ?? ""}`,
  },
  { label: piece.value.name },
]);

/* ── Variants ─────────────────────────────────────────────────────────── */

const variants = computed<ProductVariant[]>(() =>
  [...(piece.value.variants ?? [])].sort((a, b) => a.position - b.position),
);

const selectedVariantId = ref<string | null>(null);

/** Default to the first variant that can actually be bought. */
watch(
  variants,
  (list) => {
    if (!list.length) {
      selectedVariantId.value = null;
      return;
    }
    if (selectedVariantId.value && list.some((v) => v.id === selectedVariantId.value)) return;
    selectedVariantId.value = (list.find((v) => v.in_stock) ?? list[0])!.id;
  },
  { immediate: true },
);

const selectedVariant = computed(() =>
  variants.value.find((variant) => variant.id === selectedVariantId.value),
);

/* ── Price and availability ───────────────────────────────────────────── */

const price = computed(() => selectedVariant.value?.price_ngn ?? piece.value.price_ngn);

/* `productAvailability` is the only place stock state is decided. */
const availability = computed<Availability>(() =>
  productAvailability(piece.value, selectedVariant.value),
);

const AVAILABILITY_COLOUR: Record<Availability, string> = {
  "in-stock": "var(--color-success)",
  "low-stock": "var(--color-warning)",
  "made-to-order": "var(--color-info)",
  sold: "var(--text-muted)",
};

const availabilityColour = computed(() => AVAILABILITY_COLOUR[availability.value]);

const availabilityLabel = computed(() => {
  switch (availability.value) {
    case "in-stock":
      return "In stock";
    case "low-stock":
      /* The count is the point of this state — say it. */
      return `${piece.value.stock_count} left`;
    case "made-to-order":
      return "Made to order";
    default:
      return "Sold out";
  }
});

const purchasable = computed(() => availability.value !== "sold");

/* ── Actions ──────────────────────────────────────────────────────────── */

const addToBag = () => {
  if (!purchasable.value) return;
  add(piece.value, 1, selectedVariant.value);
  useToast("success", `${piece.value.name} added to your bag.`);
};

const buyNow = async () => {
  if (!purchasable.value) return;
  add(piece.value, 1, selectedVariant.value);
  await navigateTo("/checkout");
};

/* ── Accordions ───────────────────────────────────────────────────────── */

const openSection = ref<string | null>("details");

/* ── Measurement ──────────────────────────────────────────────────────── */

onMounted(() => {
  record(piece.value.slug);
  track("view_product", {
    slug: piece.value.slug,
    category: piece.value.category,
    price: piece.value.price_ngn,
  });
});

/* ── SEO ──────────────────────────────────────────────────────────────── */

const canonicalPath = computed(() => `/product/${piece.value.slug}`);

usePageSeo({
  title: () => piece.value.name,
  description: () => seoDescription(piece.value.description),
  path: canonicalPath,
  ogType: "product",
  ogImage: {
    card: "Product",
    props: {
      title: piece.value.name,
      pill: `${categoryByValue(piece.value.category)?.plural ?? "Collection"} · ${piece.value.brand}`,
      price: formatPrice(piece.value.price_ngn),
      image: getAbsoluteUrl(piece.value.images[0]),
      inStock: piece.value.in_stock,
      madeToOrder: piece.value.made_to_order,
    },
  },
  jsonLd: () => [
    productSchema({
      name: piece.value.name,
      description: piece.value.description,
      images: piece.value.images,
      path: canonicalPath.value,
      price: piece.value.price_ngn,
      inStock: piece.value.in_stock || piece.value.made_to_order,
      sku: reference.value,
      brand: piece.value.brand,
      category: categoryByValue(piece.value.category)?.plural,
    }),
    breadcrumbSchema([
      {
        name: categoryByValue(piece.value.category)?.plural ?? "Collection",
        path: `/${categoryByValue(piece.value.category)?.slug ?? ""}`,
      },
      { name: piece.value.name, path: canonicalPath.value },
    ]),
  ],
});
</script>

<style scoped>
.pdp {
  display: flex;
  flex-direction: column;
  /* Room for the fixed buy bar. */
  padding-bottom: calc(110px + var(--bottom));
}

.pdp__crumbs {
  padding-top: 16px;
  padding-bottom: 16px;
}

.pdp__layout {
  display: grid;
  grid-template-columns: 1fr;
}

/* ── Gallery ────────────────────────────────────────────────────────── */

.pdp__gallery {
  min-width: 0;
}

/* ── Info ───────────────────────────────────────────────────────────── */

.pdp__info {
  display: flex;
  flex-direction: column;
  gap: 28px;
  padding: 24px 20px 0;
}

.pdp__header {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pdp__refs {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.pdp__name {
  margin: 0;
  font-size: clamp(28px, 5vw, 34px);
  line-height: 1.05;
}

.pdp__price-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
}

.pdp__prices {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.pdp__was {
  font-size: 14px;
  color: var(--text-muted);
  text-decoration: line-through;
}

.pdp__price {
  font-size: 22px;
}

.pdp__availability {
  font-size: 12px;
  white-space: nowrap;
}

.pdp__delivery {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-secondary);
}

.pdp__description {
  margin: 6px 0 0;
  font-size: 15px;
  line-height: 1.6;
  color: var(--text-secondary);
}

/* ── Specs ──────────────────────────────────────────────────────────── */

.pdp__specs {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pdp__certificate {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-muted);
}

.pdp__certificate-mark {
  flex: 0 0 auto;
  margin-top: 4px;
  color: var(--accent);
}

/* ── Buy bar ────────────────────────────────────────────────────────── */

.pdp__buybar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: var(--z-buybar);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px calc(20px + var(--bottom));
  padding-left: calc(16px + var(--left));
  padding-right: calc(16px + var(--right));
  border-top: 1px solid var(--border-default);
}

.pdp__buybar-total {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.pdp__buybar-price {
  font-size: 15px;
}

.pdp__buybar-add {
  flex: 1;
}

.pdp__buybar-buy {
  flex: 0 0 auto;
  white-space: nowrap;
}

/* ── Rails ──────────────────────────────────────────────────────────── */

.pdp__related {
  padding-top: 48px;
}

.pdp__recent {
  padding-top: 48px;
}

/* ── Desktop ────────────────────────────────────────────────────────── */

@media (min-width: 1024px) {
  .pdp {
    padding-bottom: 0;
  }

  .pdp__layout {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 48px;
    max-width: 1280px;
    margin-inline: auto;
    padding-inline: 48px;
    align-items: start;
  }

  .pdp__info {
    position: sticky;
    top: 72px;
    align-self: start;
    padding: 0 0 48px;
  }

  /* The same bar, now a block in the column rather than viewport chrome. */
  .pdp__buybar {
    position: static;
    padding: 16px 0 0;
    border-top: 1px solid var(--border-default);
    background: none;
    backdrop-filter: none;
  }
}
</style>
