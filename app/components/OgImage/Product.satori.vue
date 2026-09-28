<template>
  <div :style="root">
    <img v-if="hasImage" :src="image" :style="photo">
    <div v-if="hasImage" :style="veil" />

    <div :style="content">
      <div :style="header">
        <div :style="monogram">
          <div :style="monogramJ">J</div>
          <div :style="monogramB">B</div>
        </div>
      </div>

      <div :style="bodyBlock">
        <div v-if="pillText" :style="eyebrow">{{ pillText }}</div>
        <div :style="{ ...titleStyle, fontWeight: props.weight }">
          {{ clampedTitle }}
        </div>

        <div :style="priceRow">
          <div v-if="price" :style="priceStyle">{{ price }}</div>
          <div v-if="price && stockLabel" :style="priceDivider" />
          <div v-if="stockLabel" :style="{ ...stockStyle, color: stockColor }">
            {{ stockLabel }}
          </div>
        </div>
      </div>

      <div :style="footer">
        <div :style="rule" />
        <div :style="domain">JEWELRYBOX.NG</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Product card — /product/[slug].
 *
 * The piece fills the right 45% of the frame under a left-to-right veil,
 * so the type always lands on near-solid obsidian however bright the
 * photograph is. Price is set in IBM Plex Mono with tabular figures.
 *
 * See Default.satori.vue for the Satori constraints this file also obeys.
 */
const props = withDefaults(
  defineProps<{
    title?: string;
    /** Eyebrow — usually the category, e.g. "Watches · Automatic". */
    pill?: string;
    /** Preformatted, e.g. "₦1,850,000". Formatting is the caller's job. */
    price?: string;
    /** Absolute URL of the product photograph. */
    image?: string;
    inStock?: boolean;
    /** True when the piece is made to order rather than held in stock. */
    madeToOrder?: boolean;
    weight?: number;
  }>(),
  {
    title: "",
    pill: "",
    price: "",
    image: "",
    inStock: true,
    madeToOrder: false,
    weight: 400,
  },
);

const OBSIDIAN = "#121010";
const HAIRLINE = "#2C2724";
const BONE = "#F3EEE6";
const BONE_SOFT = "#C9C0B4";
const BONE_MUTED = "#8C8378";
const CHAMPAGNE = "#C8A97E";
const SUCCESS = "#6FA07A";

const DISPLAY = "Marcellus OG";
const BODY = "Instrument Sans OG";
const MONO = "IBM Plex Mono OG";

const clamp = (text: string, max: number) => {
  const t = (text || "").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > 0 ? cut.slice(0, space) : cut).trimEnd()}…`;
};

const hasImage = computed(() => !!props.image && !props.image.includes("placeholder"));
const clampedTitle = computed(() => clamp(props.title, 52));
const pillText = computed(() => clamp(props.pill, 34));

const stockLabel = computed(() => {
  if (props.madeToOrder) return "Made to order";
  return props.inStock ? "In stock" : "Sold";
});
const stockColor = computed(() =>
  props.madeToOrder ? BONE_MUTED : props.inStock ? SUCCESS : BONE_MUTED,
);

const titleSize = computed(() => {
  const len = clampedTitle.value.length;
  if (len <= 18) return 74;
  if (len <= 32) return 60;
  return 48;
});

const root = {
  display: "flex",
  position: "relative" as const,
  width: "1200px",
  height: "630px",
  backgroundColor: OBSIDIAN,
  fontFamily: BODY,
  overflow: "hidden",
};

/* The photograph occupies the right 45%; the veil below softens its edge. */
const photo = {
  position: "absolute" as const,
  top: 0,
  right: 0,
  width: "540px",
  height: "630px",
  objectFit: "cover" as const,
};

/* Satori ignores the `inset` shorthand — anchor and size explicitly. */
const veil = {
  display: "flex",
  position: "absolute" as const,
  top: 0,
  left: 0,
  width: "1200px",
  height: "630px",
  // Solid through the type column, then falls away fast so the piece
  // itself is never dimmed — the photograph is the point of this card.
  backgroundImage: `linear-gradient(90deg, ${OBSIDIAN} 0%, ${OBSIDIAN} 46%, rgba(18,16,16,0.92) 54%, rgba(18,16,16,0.35) 62%, rgba(18,16,16,0) 72%, rgba(18,16,16,0) 100%)`,
};

const content = {
  display: "flex",
  flexDirection: "column" as const,
  justifyContent: "space-between",
  width: "720px",
  height: "100%",
  padding: "72px",
};

const header = { display: "flex", alignItems: "center", width: "100%" };

const monogram = {
  display: "flex",
  alignItems: "baseline",
  fontFamily: DISPLAY,
  fontSize: "58px",
  color: BONE,
  lineHeight: 1,
};
const monogramJ = { display: "flex", letterSpacing: "-0.18em" };
const monogramB = { display: "flex" };

const bodyBlock = { display: "flex", flexDirection: "column" as const };

const eyebrow = {
  display: "flex",
  marginBottom: "20px",
  fontFamily: MONO,
  fontSize: "18px",
  letterSpacing: "0.16em",
  textTransform: "uppercase" as const,
  color: CHAMPAGNE,
};

const titleStyle = computed(() => ({
  display: "flex",
  fontFamily: DISPLAY,
  fontSize: `${titleSize.value}px`,
  lineHeight: 1.1,
  letterSpacing: "0.01em",
  color: BONE,
}));

const priceRow = {
  display: "flex",
  alignItems: "center",
  marginTop: "30px",
};

const priceStyle = {
  display: "flex",
  fontFamily: MONO,
  fontSize: "32px",
  fontVariantNumeric: "tabular-nums",
  color: BONE_SOFT,
};

const priceDivider = {
  display: "flex",
  width: "1px",
  height: "24px",
  backgroundColor: HAIRLINE,
  margin: "0 22px",
};

const stockStyle = {
  display: "flex",
  fontFamily: MONO,
  fontSize: "18px",
  letterSpacing: "0.14em",
  textTransform: "uppercase" as const,
};

const footer = { display: "flex", alignItems: "center", width: "100%" };
const rule = {
  display: "flex",
  flex: 1,
  height: "1px",
  backgroundColor: HAIRLINE,
  marginRight: "28px",
};
const domain = {
  display: "flex",
  fontFamily: MONO,
  fontSize: "18px",
  letterSpacing: "0.18em",
  color: BONE_MUTED,
};
</script>
