<template>
  <div v-if="rows.length" class="hairline-table spec-table">
    <div
      v-for="(spec, index) in rows"
      :key="`${index}-${spec.label}`"
      class="hairline-table__cell"
    >
      <p class="mono-meta spec-table__label">{{ spec.label }}</p>
      <p class="spec-table__value">{{ spec.value }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SpecPair } from "~/utils/types/shop";

/**
 * The product specification table.
 *
 * `.hairline-table` owns the look — the 1px gap between cells IS the rule.
 * Two columns, whatever the piece declares: a watch files Movement / Case /
 * Crystal / Water resistance, a ring files Stone / Metal / Setting / Band.
 *
 * An odd number of pairs leaves the last cell alone on its row, which is
 * correct — padding it with a blank cell would draw a rule around nothing.
 */
const props = defineProps<{ specs: SpecPair[] }>();

const rows = computed(() => props.specs.filter((spec) => spec.label && spec.value));
</script>

<style scoped>
.spec-table {
  grid-template-columns: 1fr 1fr;
}

.spec-table__label {
  margin: 0 0 4px;
}

.spec-table__value {
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
  color: var(--text-primary);
}
</style>
