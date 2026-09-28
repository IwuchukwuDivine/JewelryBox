<template>
  <section class="luxe-card osum" :aria-label="title">
    <header class="osum__head">
      <h2 class="mono-meta osum__title">{{ title }}</h2>
      <span class="mono-meta">{{ itemCount }} {{ itemCount === 1 ? "piece" : "pieces" }}</span>
    </header>

    <slot name="lines" />

    <!-- Pay on delivery, unpriced: the door figure leads, and it is not final. -->
    <div v-if="showDue" class="osum__due">
      <p class="mono-meta osum__due-label">Due on delivery</p>
      <p class="price osum__due-figure">{{ formatPrice(subtotal) }} + delivery</p>
      <p class="osum__note">
        Delivery to {{ destinationLabel }} is not priced yet, so the amount due
        at the door is not final. We will write with the delivery fee before
        your piece travels.
      </p>
    </div>

    <dl class="osum__rows">
      <!-- Unpriced: the items figure is labelled as such and no total is
           printed anywhere — it cannot be stated without the fee. -->
      <div class="osum__row">
        <dt>{{ unpriced && !awaitingDestination ? "Amount (items)" : "Subtotal" }}</dt>
        <dd class="price">{{ formatPrice(subtotal) }}</dd>
      </div>

      <div class="osum__row">
        <dt>Delivery</dt>
        <dd class="price">
          {{
            awaitingDestination
              ? "By destination"
              : formatDeliveryFee(deliveryFee, unpricedLabel)
          }}
        </dd>
      </div>

      <div v-if="!unpriced" class="osum__row osum__row--total">
        <dt>Total</dt>
        <dd class="price osum__total">{{ formatPrice(total) }}</dd>
      </div>
    </dl>

    <!-- Nothing has been said about where it goes yet, so nothing can be
         claimed about whether that destination is priced. -->
    <p v-if="awaitingDestination" class="osum__note">
      Delivery is priced by where your piece is going. Tell us the destination
      and we will show it here.
    </p>

    <p v-else-if="unpriced && paymentMethod !== 'pay_on_delivery'" class="osum__note">
      Delivery to {{ destinationLabel }} is not priced yet. Send the item
      amount above; we will write with the delivery fee before your piece
      travels.
    </p>

    <p
      v-else-if="!unpriced && paymentMethod === 'pay_on_delivery'"
      class="osum__note"
    >
      Payable in cash or by transfer when your piece reaches you.
    </p>

    <slot />
  </section>
</template>

<script setup lang="ts">
import type { PaymentMethod } from "~/utils/types/shop";

/**
 * Line count, subtotal, delivery, total — honouring the one rule that makes
 * this component awkward: **a total that includes an unknown delivery fee
 * cannot be printed.**
 *
 * When `deliveryFee` is null the destination simply has no active rate yet.
 * That is a valid order, not an error, and the wording here has to match the
 * emails the customer will be holding:
 *
 *   bank transfer     no total anywhere; "Amount (items)" plus a note that
 *                     the fee follows by email.
 *   pay on delivery   lead with the door figure as `₦X + delivery`, and say
 *                     plainly that it is not final.
 *
 * `unpricedLabel` is passed in rather than chosen here because the tense
 * differs: checkout says "Quoted after you order" (it has not happened yet),
 * an order they already placed says "To be confirmed".
 */
const props = withDefaults(
  defineProps<{
    itemCount: number;
    subtotal: number;
    /** null ⇒ the destination has no active rate. Not an error. */
    deliveryFee: number | null;
    /** Wording for a null fee. Tense differs before and after ordering. */
    unpricedLabel: string;
    /** null before the customer has chosen one, on checkout steps 1–2. */
    paymentMethod?: PaymentMethod | null;
    /** Area or state, named in the unpriced note. */
    destination?: string;
    title?: string;
  }>(),
  { paymentMethod: null, destination: "", title: "Order summary" },
);

const unpriced = computed(() => props.deliveryFee === null);

/**
 * No fee AND no destination — the opening state of checkout, before the
 * customer has said where it goes.
 *
 * Distinguished from a genuinely unpriced destination because the two mean
 * opposite things: one says "we have not been told", the other says "we have
 * not priced it". Saying the second on step 1 tells the customer their
 * address is unserviceable before they have given one.
 */
const awaitingDestination = computed(
  () => unpriced.value && !props.destination.trim(),
);

const showDue = computed(
  () =>
    unpriced.value &&
    !awaitingDestination.value &&
    props.paymentMethod === "pay_on_delivery",
);

const total = computed(() => props.subtotal + (props.deliveryFee ?? 0));

const destinationLabel = computed(() =>
  props.destination.trim() ? props.destination.trim() : "your address",
);
</script>

<style scoped>
.osum {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
}

.osum__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.osum__title {
  margin: 0;
}

/* ── Pay on delivery, unpriced ───────────────────────────────────────── */

.osum__due {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-brand);
  background: var(--surface);
}

.osum__due-label {
  margin: 0;
}

.osum__due-figure {
  margin: 0;
  font-size: 20px;
  line-height: 1.2;
  color: var(--text-primary);
}

/* ── Figures ─────────────────────────────────────────────────────────── */

.osum__rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
}

.osum__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  font-size: 13px;
  color: var(--text-secondary);
}

.osum__row dt,
.osum__row dd {
  margin: 0;
}

.osum__row--total {
  padding-top: 10px;
  border-top: 1px solid var(--border-default);
  color: var(--text-primary);
}

.osum__total {
  font-size: 18px;
}

.osum__note {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-muted);
}
</style>
