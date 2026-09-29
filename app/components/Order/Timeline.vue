<template>
  <ol class="timeline">
    <li
      v-for="node in nodes"
      :key="node.status"
      class="timeline__node"
      :class="{
        'timeline__node--done': node.complete,
        'timeline__node--cancelled': node.status === 'cancelled',
      }"
    >
      <span class="timeline__mark" aria-hidden="true" />

      <p class="timeline__label">{{ node.label }}</p>

      <time v-if="node.at" class="mono-meta timeline__at" :datetime="node.at">
        {{ formatDate(node.at) }}
      </time>

      <p v-if="node.note" class="timeline__note">{{ node.note }}</p>
    </li>
  </ol>
</template>

<script setup lang="ts">
import type { Order, OrderStatus } from "~/utils/types/shop";

/**
 * The order's journey, drawn strictly from `ORDER_FLOW[payment_method]`.
 *
 * That is the whole point of the component: a pay-on-delivery order has no
 * `confirmed` node at all, because its lane is
 * `received → shipped → delivered`. Hard-coding four steps and hiding one
 * would put a gap in the rail where the customer expects a step.
 *
 * A cancelled order keeps only the steps it actually reached and ends on the
 * cancellation — nothing after the cancellation will ever happen, so nothing
 * after it is drawn as pending.
 */
const props = defineProps<{ order: Order }>();

interface TimelineNode {
  status: OrderStatus;
  label: string;
  at: string;
  note: string;
  complete: boolean;
}

/**
 * The most recent history entry for a status. A reverse scan rather than
 * `findLast()`, which is ES2023 and not guaranteed by the project's lib —
 * the same call the order emails make.
 */
const lastEventFor = (status: OrderStatus) => {
  const history = props.order.status_history;
  for (let i = history.length - 1; i >= 0; i--) {
    const event = history[i];
    if (event && event.status === status) return event;
  }
  return undefined;
};

const toNode = (status: OrderStatus): TimelineNode => {
  const event = lastEventFor(status);
  return {
    status,
    label: statusDefinition(status).customerLabel,
    at: event?.at ?? "",
    note: event?.note ?? "",
    complete: Boolean(event),
  };
};

const isCancelled = computed(() => props.order.status === "cancelled");

const nodes = computed<TimelineNode[]>(() => {
  const flow = ORDER_FLOW[props.order.payment_method];
  const steps = flow
    .map(toNode)
    // A cancelled order will never reach the rest of its lane.
    .filter((node) => !isCancelled.value || node.complete);

  if (isCancelled.value) steps.push(toNode("cancelled"));

  return steps;
});
</script>

<style scoped>
/* The vertical rail: one hairline, circles sitting astride it. */
.timeline {
  display: flex;
  flex-direction: column;
  gap: 22px;
  margin: 0;
  padding: 2px 0 2px 22px;
  border-left: 1px solid var(--border-default);
  list-style: none;
}

.timeline__node {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.timeline__mark {
  position: absolute;
  top: 3px;
  /* Half the circle plus the rail's own hairline. */
  left: -28px;
  width: 11px;
  height: 11px;
  border: 1px solid var(--border-strong);
  border-radius: 50%;
  background: var(--surface);
  transition: background-color var(--dur-hover) var(--ease-brand);
}

.timeline__node--done .timeline__mark {
  background: var(--text-primary);
  border-color: var(--text-primary);
}

.timeline__node--cancelled .timeline__mark {
  background: var(--color-error);
  border-color: var(--color-error);
}

.timeline__label {
  margin: 0;
  font-size: 14px;
  line-height: 1.4;
  color: var(--text-muted);
}

.timeline__node--done .timeline__label {
  color: var(--text-primary);
}

.timeline__node--cancelled .timeline__label {
  color: var(--color-error);
}

.timeline__at {
  color: var(--text-muted);
}

.timeline__note {
  margin: 2px 0 0;
  font-size: 13px;
  line-height: 1.55;
  color: var(--text-secondary);
}
</style>
