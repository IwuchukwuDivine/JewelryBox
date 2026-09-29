<template>
  <span class="status" :class="`status--${definition.tone}`">
    <span class="status__dot" aria-hidden="true" />
    <span class="status__label">{{ label }}</span>
    <span v-if="position" class="mono-meta status__step">{{ position }}</span>
  </span>
</template>

<script setup lang="ts">
import type { OrderStatus, PaymentMethod } from "~/utils/types/shop";

/**
 * Where an order stands, in one pill.
 *
 * Both lanes render from the same component because the position is read off
 * `ORDER_FLOW[payment_method]`, never off a hard-coded list: `shipped` is
 * 3 / 4 on a bank transfer and 2 / 3 on a pay-on-delivery order, and
 * `confirmed` simply does not exist in the second lane.
 *
 * `cancelled` is outside every flow, so it carries no position — which is
 * correct, not a gap.
 */
const props = withDefaults(
  defineProps<{
    status: OrderStatus;
    /** Decides which lane the position is counted against. */
    paymentMethod: PaymentMethod;
    /** Admin wording (`Payment confirmed`) instead of the customer's. */
    admin?: boolean;
    /** Hide the `2 / 4` position. */
    showPosition?: boolean;
  }>(),
  { admin: false, showPosition: true },
);

const definition = computed(() => statusDefinition(props.status));

const label = computed(() =>
  props.admin ? definition.value.label : definition.value.customerLabel,
);

const position = computed(() => {
  if (!props.showPosition) return "";
  const flow = ORDER_FLOW[props.paymentMethod];
  const index = flow.indexOf(props.status);
  // `cancelled`, or a status that does not belong to this lane at all.
  if (index === -1) return "";
  return `${index + 1} / ${flow.length}`;
});
</script>

<style scoped>
.status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-brand);
  background: var(--surface-muted);
  color: var(--text-primary);
}

.status__dot {
  flex: 0 0 auto;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--tone);
}

.status__label {
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0.02em;
}

.status__step {
  color: var(--text-muted);
}

/* Tone comes from the status definition, mapped to the semantic tokens. */
.status--info {
  --tone: var(--color-info);
}
.status--success {
  --tone: var(--color-success);
}
.status--warning {
  --tone: var(--color-warning);
}
.status--error {
  --tone: var(--color-error);
}
.status--neutral {
  --tone: var(--text-muted);
}

.status--error .status__label {
  color: var(--color-error);
}
</style>
