<template>
  <div :style="root">
    <img v-if="hasImage" :src="image" :style="photo">
    <div :style="veil" />

    <div :style="content">
      <div :style="monogram">
        <div :style="monogramJ">J</div>
        <div :style="monogramB">B</div>
      </div>

      <div :style="bodyBlock">
        <div v-if="pillText" :style="eyebrow">{{ pillText }}</div>
        <div :style="{ ...titleStyle, fontWeight: props.weight }">
          {{ clampedTitle }}
        </div>
        <div v-if="clampedDescription" :style="descriptionStyle">
          {{ clampedDescription }}
        </div>
        <div :style="domain">JEWELRYBOX.NG</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { OBSIDIAN, BONE, BONE_SOFT, BONE_MUTED, CHAMPAGNE } from "~/utils/constants/brand";
/**
 * Campaign / editorial card — /campaign/[slug].
 *
 * Full-bleed photograph with a bottom-up veil, type anchored to the lower
 * left. The only card without the hairline frame: editorial imagery is
 * meant to run to the edge.
 *
 * See Default.satori.vue for the Satori constraints this file also obeys.
 */
const props = withDefaults(
  defineProps<{
    title?: string;
    /** Eyebrow, e.g. "Campaign · Autumn 2026". */
    pill?: string;
    description?: string;
    /** Absolute URL of the campaign image. */
    image?: string;
    weight?: number;
  }>(),
  { title: "", pill: "", description: "", image: "", weight: 400 },
);


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
const clampedTitle = computed(() => clamp(props.title, 56));
const clampedDescription = computed(() => clamp(props.description, 110));
const pillText = computed(() => clamp(props.pill, 40));

const titleSize = computed(() => {
  const len = clampedTitle.value.length;
  if (len <= 20) return 84;
  if (len <= 38) return 68;
  return 54;
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

/* Satori ignores the `inset` shorthand — anchor and size explicitly or the
   layer silently does not paint. */
const photo = {
  position: "absolute" as const,
  top: 0,
  left: 0,
  width: "1200px",
  height: "630px",
  objectFit: "cover" as const,
};

/* Bottom-up veil so the type reads over any exposure. */
const veil = {
  display: "flex",
  position: "absolute" as const,
  top: 0,
  left: 0,
  width: "1200px",
  height: "630px",
  backgroundImage:
    "linear-gradient(0deg, rgba(18,16,16,0.95) 0%, rgba(18,16,16,0.72) 38%, rgba(18,16,16,0.18) 72%, rgba(18,16,16,0.05) 100%)",
};

const content = {
  display: "flex",
  flexDirection: "column" as const,
  justifyContent: "space-between",
  width: "100%",
  height: "100%",
  padding: "72px",
};

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

const bodyBlock = {
  display: "flex",
  flexDirection: "column" as const,
  maxWidth: "900px",
};

const eyebrow = {
  display: "flex",
  marginBottom: "20px",
  fontFamily: MONO,
  fontSize: "19px",
  letterSpacing: "0.16em",
  textTransform: "uppercase" as const,
  color: CHAMPAGNE,
};

const titleStyle = computed(() => ({
  display: "flex",
  fontFamily: DISPLAY,
  fontSize: `${titleSize.value}px`,
  lineHeight: 1.05,
  letterSpacing: "0.01em",
  color: BONE,
}));

const descriptionStyle = {
  display: "flex",
  marginTop: "22px",
  fontSize: "25px",
  lineHeight: 1.5,
  color: BONE_SOFT,
};

const domain = {
  display: "flex",
  marginTop: "34px",
  fontFamily: MONO,
  fontSize: "18px",
  letterSpacing: "0.18em",
  color: BONE_MUTED,
};
</script>
