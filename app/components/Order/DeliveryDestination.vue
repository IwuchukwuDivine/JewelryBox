<template>
  <div class="dest">
    <AppSelect
      :model-value="state"
      :options="stateOptions"
      :error="stateError"
      label="State"
      placeholder="Select state"
      required
      @update:model-value="pickState"
    />

    <!-- Lagos is the only state priced per area, because a rider to Ikeja and
         one to Ajah are not the same job. -->
    <AppSelect
      v-if="isLagos"
      :model-value="area"
      :options="areaOptions"
      :error="areaError"
      :hint="areaHint"
      label="Lagos area"
      placeholder="Select area"
      required
      @update:model-value="pickArea"
    />

    <!-- Shown, never chosen. `deliveryMethodForState()` decides the method and
         the rate table decides the fee; the customer only says where. -->
    <div class="dest__quote" aria-live="polite">
      <template v-if="!answerable">
        <p class="mono-meta dest__label">Delivery</p>
        <p class="dest__value">{{ waitingCopy }}</p>
      </template>

      <template v-else-if="isPending">
        <p class="mono-meta dest__label">Delivery</p>
        <AppSkeleton variant="text" width="52%" />
      </template>

      <template v-else-if="isError">
        <p class="mono-meta dest__label">Delivery</p>
        <p class="dest__value">Quoted after you order</p>
        <p class="dest__note">
          We could not reach the rate table just now. Your order still goes
          through — we will confirm the delivery fee by email.
        </p>
      </template>

      <template v-else-if="quote">
        <p class="mono-meta dest__label">{{ methodLabel }} · {{ quote.label }}</p>
        <p class="price dest__value">
          {{ formatDeliveryFee(quote.fee_ngn, UNPRICED_LABEL) }}
        </p>
      </template>

      <!-- `null` is a real answer: she has not priced this destination yet. -->
      <template v-else>
        <p class="mono-meta dest__label">{{ methodLabel }} · {{ destinationName }}</p>
        <p class="dest__value">Delivery quoted after you order</p>
        <p class="dest__note">
          We have not priced this destination yet. Place your order as normal
          and we will email the delivery fee before anything travels.
        </p>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { LAGOS_AREA_GROUPS } from "~/utils/constants/lagosAreas";
import { NIGERIAN_STATES } from "~/utils/constants/states";

/**
 * Where it goes — and therefore how, and therefore what it costs.
 *
 * This is deliberately **not** a delivery method picker. The customer picks a
 * state (and a Lagos area, when the state is Lagos); the method comes from
 * `deliveryMethodForState()` and the fee from the rate table. Letting anyone
 * choose "dispatch" to Kano would be a quote the shop cannot honour.
 *
 * An unpriced destination is not an error. `useDeliveryQuoteQuery` resolving
 * to `null` means no active rate yet: it renders "Delivery quoted after you
 * order" and checkout carries on, placing the order with a null fee.
 */

/** Checkout's tense: the customer has not ordered yet. */
const UNPRICED_LABEL = "Quoted after you order";

const props = defineProps<{
  state: string;
  area: string;
  stateError?: string;
  areaError?: string;
}>();

const emit = defineEmits<{
  "update:state": [value: string];
  "update:area": [value: string];
}>();

const isLagos = computed(() => deliveryMethodForState(props.state) === "dispatch");

const stateOptions = computed(() =>
  NIGERIAN_STATES.map((state) => ({ label: state, value: state })),
);

/* ── Lagos areas ──────────────────────────────────────────────────────── */

const optionsQuery = useDeliveryOptionsQuery();

/** The seed list, flattened. Only reached when the live rates are unavailable. */
const fallbackAreas = computed(() =>
  LAGOS_AREA_GROUPS.flatMap((group) => group.areas),
);

const liveAreas = computed(() =>
  (optionsQuery.data.value?.areas ?? []).map((rate) => rate.name),
);

const usingFallback = computed(
  () => liveAreas.value.length === 0 && !optionsQuery.isPending.value,
);

const areaOptions = computed(() =>
  (usingFallback.value ? fallbackAreas.value : liveAreas.value).map((name) => ({
    label: name,
    value: name,
  })),
);

const areaHint = computed(() =>
  usingFallback.value
    ? "Showing our standard areas — the exact fee is confirmed on your order."
    : "",
);

/* ── The quote ────────────────────────────────────────────────────────── */

/**
 * The same query key checkout uses, so the two share one cache entry and one
 * request rather than asking the rate table twice for the same answer.
 */
const quoteQuery = useDeliveryQuoteQuery(() => ({
  state: props.state,
  area: props.area,
}));

const quote = computed(() => quoteQuery.data.value ?? null);
const isError = computed(() => quoteQuery.isError.value);

/** A Lagos address cannot be answered until the area is chosen. */
const answerable = computed(() => {
  if (!props.state.trim()) return false;
  return !isLagos.value || Boolean(props.area.trim());
});

const isPending = computed(
  () => answerable.value && quoteQuery.isFetching.value && !quoteQuery.data.value,
);

const waitingCopy = computed(() =>
  props.state.trim() && isLagos.value
    ? "Choose your Lagos area to see how it travels."
    : "Choose a state to see how it travels.",
);

const methodLabel = computed(() =>
  deliveryMethodForState(props.state) === "dispatch"
    ? "Dispatch rider"
    : "Air freight",
);

const destinationName = computed(() =>
  isLagos.value ? props.area.trim() : props.state.trim(),
);

/* ── Selection ────────────────────────────────────────────────────────── */

const pickState = (value: string | number | null) => {
  const next = String(value ?? "");
  emit("update:state", next);
  // An area only means something in Lagos; carrying a stale one elsewhere
  // would put the wrong destination on the order.
  if (deliveryMethodForState(next) !== "dispatch") emit("update:area", "");
};

const pickArea = (value: string | number | null) => {
  emit("update:area", String(value ?? ""));
};
</script>

<style scoped>
.dest {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.dest__quote {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-brand);
  background: var(--surface-muted);
}

.dest__label {
  margin: 0;
}

.dest__value {
  margin: 0;
  font-size: 15px;
  line-height: 1.4;
  color: var(--text-primary);
}

.dest__note {
  margin: 2px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-muted);
}
</style>
