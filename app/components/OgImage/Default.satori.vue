<template>
  <div :style="root">
    <div :style="frame" />

    <div :style="content">
      <div :style="header">
        <div :style="monogram">
          <div :style="monogramJ">J</div>
          <div :style="monogramB">B</div>
        </div>
        <div v-if="pillText" :style="eyebrow">{{ pillText }}</div>
      </div>

      <div :style="bodyBlock">
        <div :style="{ ...titleStyle, fontWeight: props.weight }">
          {{ clampedTitle }}
        </div>
        <div v-if="clampedDescription" :style="descriptionStyle">
          {{ clampedDescription }}
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
import { OBSIDIAN, HAIRLINE_DARK as HAIRLINE, BONE, BONE_SOFT, BONE_MUTED, CHAMPAGNE } from "~/utils/constants/brand";
/**
 * The default share card: home, about, contact, faq.
 *
 * Rendered by nuxt-og-image through Satori, which:
 *   · resolves no CSS variables — every colour here is a hex literal
 *   · needs an explicit `display: flex` on anything with >1 child
 *   · has no line-clamp or text-overflow, so text is cut in a computed
 *   · only sees the "… OG" TTF families registered in nuxt.config.ts
 *
 * The monogram is set in type rather than loaded as an image: the brand
 * book defines it as Marcellus J + B with the J tucked under at -0.18em.
 */
const props = withDefaults(
  defineProps<{
    title?: string;
    /** Eyebrow above the title, e.g. "Contact" or "The Watch Edit". */
    pill?: string;
    description?: string;
    /** Referenced in the style binding so Satori keeps every weight. */
    weight?: number;
  }>(),
  {
    title: "JewelryBox",
    pill: "",
    description: "",
    weight: 400,
  },
);

/* ── Palette · mirrors :root/.dark in app/assets/css/main.css ────────── */

const DISPLAY = "Marcellus OG";
const BODY = "Instrument Sans OG";
const MONO = "IBM Plex Mono OG";

/* Satori has no text-overflow — cut at the last space before the limit. */
const clamp = (text: string, max: number) => {
  const t = (text || "").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > 0 ? cut.slice(0, space) : cut).trimEnd()}…`;
};

const clampedTitle = computed(() => clamp(props.title, 78));
const clampedDescription = computed(() => clamp(props.description, 130));
const pillText = computed(() => clamp(props.pill, 40));

/* Size ladder — long titles step down so three lines is the ceiling. */
const titleSize = computed(() => {
  const len = clampedTitle.value.length;
  if (len <= 22) return 82;
  if (len <= 40) return 68;
  if (len <= 60) return 56;
  return 46;
});

const root = {
  display: "flex",
  position: "relative" as const,
  width: "1200px",
  height: "630px",
  backgroundColor: OBSIDIAN,
  fontFamily: BODY,
};

const frame = {
  display: "flex",
  position: "absolute" as const,
  top: "40px",
  left: "40px",
  right: "40px",
  bottom: "40px",
  border: `1px solid ${HAIRLINE}`,
};

const content = {
  display: "flex",
  flexDirection: "column" as const,
  justifyContent: "space-between",
  width: "100%",
  height: "100%",
  padding: "88px",
};

const header = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
};

const monogram = {
  display: "flex",
  alignItems: "baseline",
  fontFamily: DISPLAY,
  fontSize: "62px",
  color: BONE,
  lineHeight: 1,
};
const monogramJ = { display: "flex", letterSpacing: "-0.18em" };
const monogramB = { display: "flex" };

const eyebrow = {
  display: "flex",
  fontFamily: MONO,
  fontSize: "19px",
  letterSpacing: "0.16em",
  textTransform: "uppercase" as const,
  color: CHAMPAGNE,
};

const bodyBlock = {
  display: "flex",
  flexDirection: "column" as const,
  maxWidth: "880px",
};

const titleStyle = computed(() => ({
  display: "flex",
  fontFamily: DISPLAY,
  fontSize: `${titleSize.value}px`,
  lineHeight: 1.1,
  letterSpacing: "0.01em",
  color: BONE,
}));

const descriptionStyle = {
  display: "flex",
  marginTop: "26px",
  fontSize: "26px",
  lineHeight: 1.5,
  color: BONE_SOFT,
};

const footer = {
  display: "flex",
  alignItems: "center",
  width: "100%",
};

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
