<template>
  <div :style="root">
    <div :style="frame" />

    <div :style="content">
      <div :style="header">
        <div :style="monogram">
          <div :style="monogramJ">J</div>
          <div :style="monogramB">B</div>
        </div>
        <div v-if="countLabel" :style="countPill">{{ countLabel }}</div>
      </div>

      <div :style="bodyBlock">
        <div v-if="pillText" :style="eyebrow">{{ pillText }}</div>
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
 * Collection / category card — /watches, /rings, /moissanite …
 *
 * Same obsidian frame as Default, with a bordered piece-count pill in the
 * top-right. See Default.satori.vue for the full list of Satori
 * constraints this file also obeys.
 */
const props = withDefaults(
  defineProps<{
    title?: string;
    /** Eyebrow, e.g. "The Watch Edit". */
    pill?: string;
    description?: string;
    /** Number of pieces in the collection. 0 hides the pill. */
    count?: number;
    weight?: number;
  }>(),
  { title: "Collection", pill: "", description: "", count: 0, weight: 400 },
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

const clampedTitle = computed(() => clamp(props.title, 58));
const clampedDescription = computed(() => clamp(props.description, 120));
const pillText = computed(() => clamp(props.pill, 36));
const countLabel = computed(() =>
  props.count > 0 ? `${props.count} ${props.count === 1 ? "piece" : "pieces"}` : "",
);

const titleSize = computed(() => {
  const len = clampedTitle.value.length;
  if (len <= 20) return 78;
  if (len <= 36) return 64;
  return 52;
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

const countPill = {
  display: "flex",
  padding: "10px 18px",
  border: `1px solid ${HAIRLINE}`,
  fontFamily: MONO,
  fontSize: "17px",
  letterSpacing: "0.16em",
  textTransform: "uppercase" as const,
  color: BONE_SOFT,
};

const bodyBlock = {
  display: "flex",
  flexDirection: "column" as const,
  maxWidth: "880px",
};

const eyebrow = {
  display: "flex",
  marginBottom: "22px",
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
  lineHeight: 1.1,
  letterSpacing: "0.01em",
  color: BONE,
}));

const descriptionStyle = {
  display: "flex",
  marginTop: "24px",
  fontSize: "25px",
  lineHeight: 1.5,
  color: BONE_SOFT,
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
