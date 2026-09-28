<template>
  <AppContainer as="main" class="co">
    <!-- The bag lives in localStorage, so it is not knowable on the server.
         Hold the shape until mount rather than reflowing into it. -->
    <div v-if="!mounted" class="co__layout">
      <div class="co__main">
        <div class="co__head">
          <AppSkeleton variant="text" width="38%" />
          <div class="co__bars">
            <span v-for="n in 3" :key="n" class="co__bar" />
          </div>
          <AppSkeleton variant="text" width="64%" height="32px" />
        </div>
        <div class="co__fields">
          <AppSkeleton v-for="n in 3" :key="n" height="52px" />
        </div>
      </div>
      <div class="co__aside">
        <AppSkeleton height="300px" />
      </div>
    </div>

    <AppForm
      v-else
      v-model="stepValid"
      class="co__form"
      @submit="advance"
      @invalid="nudge"
    >
      <div class="co__layout">
        <section class="co__main">
          <header class="co__head">
            <div class="mono-meta co__meta">
              <span>Checkout</span>
              <span>Step {{ step }} / 3</span>
            </div>

            <div class="co__bars" aria-hidden="true">
              <span
                v-for="n in 3"
                :key="n"
                class="co__bar"
                :class="{ 'co__bar--on': n <= step }"
              />
            </div>

            <h1 class="display-heading co__title">{{ title }}</h1>
          </header>

          <!-- ── 1 · Who is this for? ─────────────────────────────────── -->
          <div v-if="step === 1" class="co__fields">
            <AppInput
              v-model="form.full_name"
              label="Full name"
              placeholder="Adaeze Okonkwo"
              autocomplete="name"
              :rules="nameRules"
              :error="errorFor(1, form.full_name, nameRules)"
              required
            />

            <AppInput
              v-model="form.email"
              label="Email"
              type="email"
              placeholder="you@example.com"
              autocomplete="email"
              :rules="emailRules"
              :error="errorFor(1, form.email, emailRules)"
              hint="Your order confirmation and every update go here."
              required
            />

            <AppInput
              v-model="form.phone"
              label="Phone"
              type="tel"
              placeholder="0803 000 0000"
              autocomplete="tel"
              :rules="phoneRules"
              :error="errorFor(1, form.phone, phoneRules)"
              required
            />
          </div>

          <!-- ── 2 · Where should it go? ──────────────────────────────── -->
          <div v-else-if="step === 2" class="co__fields">
            <OrderDeliveryDestination
              v-model:state="form.state"
              v-model:area="form.area"
              :state-error="stateError"
              :area-error="areaError"
            />

            <AppInput
              v-model="form.city"
              label="City"
              placeholder="Lekki"
              autocomplete="address-level2"
              :rules="requiredRules"
              :error="errorFor(2, form.city, requiredRules)"
              required
            />

            <AppInput
              v-model="form.line1"
              label="Address"
              placeholder="12 Admiralty Way"
              autocomplete="address-line1"
              :rules="addressRules"
              :error="errorFor(2, form.line1, addressRules)"
              required
            />

            <AppInput
              v-model="form.notes"
              label="Delivery instructions (optional)"
              placeholder="Call on arrival"
              :rules="notesRules"
              :error="errorFor(2, form.notes, notesRules)"
            />
          </div>

          <!-- ── 3 · How would you like to pay? ───────────────────────── -->
          <div v-else class="co__fields">
            <OrderPaymentMethodPicker
              v-model="payment"
              label="Payment"
              :error="paymentError"
            />

            <AppCheckbox
              v-model="saveDetails"
              label="Save my delivery details on this device"
              hint="So your next order is two taps instead of ten."
            />
          </div>

          <button
            v-if="step > 1"
            type="button"
            class="text-link co__back"
            @click="back"
          >
            Back
          </button>
        </section>

        <aside class="co__aside" aria-label="Order summary">
          <OrderSummary
            :item-count="summaryCount"
            :subtotal="summarySubtotal"
            :delivery-fee="deliveryFee"
            :payment-method="payment"
            :destination="destinationName"
            :unpriced-label="UNPRICED_LABEL"
          >
            <template #lines>
              <ul class="co__lines">
                <li v-for="line in summaryItems" :key="cartLineKey(line)" class="co__line">
                  <CartLineItem :line="line" readonly />
                </li>
              </ul>
            </template>

            <div class="co__cta">
              <div v-if="failure" class="co__failure" role="alert">
                <lucide-circle-alert
                  :size="15"
                  :stroke-width="1.5"
                  class="co__failure-icon"
                  aria-hidden="true"
                />
                <div class="co__failure-body">
                  <p class="co__failure-message">{{ failure.message }}</p>
                  <button
                    v-if="failure.action"
                    type="button"
                    class="text-link"
                    @click="failure?.action?.run()"
                  >
                    {{ failure.action.label }}
                  </button>
                </div>
              </div>

              <AppButton type="submit" size="lg" block :loading="placing">
                {{ ctaLabel }}
              </AppButton>

              <p class="co__reassure">
                Your details are used for this delivery and nothing else.
              </p>
            </div>
          </OrderSummary>
        </aside>
      </div>
    </AppForm>
  </AppContainer>
</template>

<script setup lang="ts">
import type { Rule } from "~/utils/types/forms";
import type { Address, CartLine, PaymentMethod } from "~/utils/types/shop";

/**
 * Checkout: three input steps and a receipt, not four.
 *
 * Who it is for → where it goes → how they pay. There is no separate review
 * step because the order summary is on screen the whole way through, so the
 * review is continuous rather than a screen the customer has to reach.
 *
 * Two things this page must not do:
 *   · offer a delivery method. `deliveryMethodForState()` decides it, and a
 *     fee the customer chose is a fee the shop cannot honour.
 *   · refuse an order to an unpriced destination. A null fee is a valid
 *     order; the fee follows by email.
 */

definePageMeta({ middleware: "checkout" });

/** Checkout's tense — the customer has not ordered yet. */
const UNPRICED_LABEL = "Quoted after you order";

const mounted = useMounted();
const { items, count, subtotal, remove: removeLine } = useCart();
const { placeOrder } = useOrders();
const savedAddress = useSavedAddressStore();
const { user } = useApp();

/* ── The form ─────────────────────────────────────────────────────────── */

const form = reactive({
  full_name: "",
  email: "",
  phone: "",
  state: "",
  area: "",
  city: "",
  line1: "",
  notes: "",
});

const payment = ref<PaymentMethod | null>(null);
const saveDetails = ref(true);

const addressRules: Rule[] = [...requiredRules, minLength(5), maxLength(120)];
const notesRules: Rule[] = [maxLength(280)];

const isLagos = computed(() => deliveryMethodForState(form.state) === "dispatch");

const destinationName = computed(() =>
  isLagos.value ? form.area.trim() : form.state.trim(),
);

/* ── Prefill ──────────────────────────────────────────────────────────── */

/**
 * Prefill once, and never over something the customer has already typed.
 *
 * The session resolves asynchronously, so without this guard a slow
 * `useAuth().ready()` could land halfway through a half-typed form and
 * overwrite the name and email underneath the cursor.
 */
const prefilled = ref(false);

const isDirty = computed(() =>
  Object.values(form).some((value) => value.trim().length > 0),
);

const prefill = () => {
  if (prefilled.value || isDirty.value) return;

  const saved = savedAddress.address;
  if (saved) {
    form.full_name = saved.full_name;
    form.email = saved.email;
    form.phone = saved.phone;
    form.state = saved.state;
    form.area = saved.area ?? "";
    form.city = saved.city;
    form.line1 = saved.line1;
  }

  const session = user.value;
  if (session) {
    if (!form.full_name) form.full_name = session.full_name ?? "";
    if (!form.email) form.email = session.email;
    if (!form.phone) form.phone = session.phone ?? "";
  }

  if (saved || session) prefilled.value = true;
};

onMounted(prefill);
watch(user, prefill);

/* ── Delivery ─────────────────────────────────────────────────────────── */

/**
 * The same destination getter `OrderDeliveryDestination` passes, so the two
 * share one cache entry and the rate table is asked once, not twice.
 */
const quoteQuery = useDeliveryQuoteQuery(() => ({
  state: form.state,
  area: form.area,
}));

/** null ⇒ unpriced destination, or no answer yet. Both mean "quoted later". */
const deliveryFee = computed<number | null>(
  () => quoteQuery.data.value?.fee_ngn ?? null,
);

/* ── The bag, held still while the order is placed ────────────────────── */

/**
 * `placeOrder()` empties the bag before the route change finishes, so for a
 * frame or two the summary would render an empty order and a `Pay ₦0` button
 * underneath the customer's own click. Freezing the figures for the duration
 * of the submit is the fix; a failure thaws them again.
 */
const frozen = ref<{ items: CartLine[]; count: number; subtotal: number } | null>(
  null,
);

const summaryItems = computed(() => frozen.value?.items ?? items.value);
const summaryCount = computed(() => frozen.value?.count ?? count.value);
const summarySubtotal = computed(() => frozen.value?.subtotal ?? subtotal.value);

const total = computed(() => summarySubtotal.value + (deliveryFee.value ?? 0));

/* ── Steps ────────────────────────────────────────────────────────────── */

const step = ref(1);
const stepValid = ref(false);

/** Set when the customer tries to move on, so red appears only when earned. */
const attempted = reactive<Record<number, boolean>>({ 1: false, 2: false, 3: false });

const TITLES = [
  "Who is this for?",
  "Where should it go?",
  "How would you like to pay?",
] as const;

const title = computed(() => TITLES[step.value - 1] ?? TITLES[0]);

const firstFailure = (value: string, rules: Rule[]) =>
  rules.find((entry) => !entry.rule(value))?.message ?? "";

/** The same message the field's own rules would show, forced on after a nudge. */
const errorFor = (stepNumber: number, value: string, rules: Rule[]) =>
  attempted[stepNumber] ? firstFailure(value, rules) : "";

const stateError = computed(() =>
  attempted[2] && !form.state.trim() ? "Choose the delivery state." : "",
);

const areaError = computed(() =>
  attempted[2] && isLagos.value && !form.area.trim()
    ? "Choose your Lagos area."
    : "",
);

const paymentError = computed(() =>
  attempted[3] && !payment.value ? "Choose how you would like to pay." : "",
);

const nudge = () => {
  attempted[step.value] = true;
};

const back = () => {
  if (step.value === 1) return;
  step.value -= 1;
  scrollToTop();
};

/* ── The call to action ───────────────────────────────────────────────── */

/**
 * `Pay {total}` — except where the unpriced rules forbid printing a total.
 *
 * A bank transfer to an unpriced destination shows no total anywhere, and a
 * pay-on-delivery one leads with the door figure as `₦X + delivery`, because
 * that is exactly what the order email will say.
 */
const ctaLabel = computed(() => {
  if (step.value < 3) return "Continue";

  const priced = deliveryFee.value !== null;

  if (payment.value === "bank_transfer") {
    return priced ? `Pay ${formatPrice(total.value)}` : "Place order";
  }

  if (payment.value === "pay_on_delivery") {
    return priced
      ? `Place order · ${formatPrice(total.value)} on delivery`
      : `Place order · ${formatPrice(summarySubtotal.value)} + delivery`;
  }

  return "Place order";
});

/* ── Submitting ───────────────────────────────────────────────────────── */

interface Failure {
  message: string;
  action?: { label: string; run: () => void };
}

const placing = ref(false);
const failure = ref<Failure | null>(null);

const address = computed<Address>(() => ({
  full_name: form.full_name.trim(),
  email: form.email.trim(),
  phone: form.phone.trim(),
  line1: form.line1.trim(),
  city: form.city.trim(),
  state: form.state.trim(),
  ...(isLagos.value ? { area: form.area.trim() } : {}),
  country: "NG",
  ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
}));

const goTo2 = () => {
  step.value = 2;
  failure.value = null;
  scrollToTop();
};

const lineNamedIn = (message: string): CartLine | undefined =>
  // Branching happens on the CODE, above. The message is only read here to
  // find which line the database was talking about, so we can offer to act
  // on it — it already names the piece, in wording written for the customer.
  items.value.find((line) => message.includes(line.name));

const describe = (error: unknown): Failure => {
  const message = error instanceof Error ? error.message : "";
  const code = errorCode(error);

  switch (code) {
    case ERROR_CODES.soldOut:
    case ERROR_CODES.productUnavailable: {
      const line = lineNamedIn(message);
      return {
        message,
        action: line
          ? {
              label: `Remove ${line.name} and continue`,
              run: () => {
                removeLine(cartLineKey(line));
                failure.value = null;
              },
            }
          : { label: "Review your bag", run: () => void navigateTo("/cart") },
      };
    }

    case ERROR_CODES.variantUnavailable: {
      const line = lineNamedIn(message);
      return {
        message,
        action: line
          ? {
              label: "Choose another option",
              run: () => void navigateTo(`/product/${line.slug}`),
            }
          : { label: "Review your bag", run: () => void navigateTo("/cart") },
      };
    }

    case ERROR_CODES.rateMismatch:
      return {
        message,
        action: {
          label: "Confirm your destination",
          run: () => {
            void quoteQuery.refetch();
            goTo2();
          },
        },
      };

    case ERROR_CODES.orderRateLimited:
      return {
        message,
        action: { label: "Talk to the house", run: () => void navigateTo("/contact") },
      };

    case ERROR_CODES.emptyCart:
      return {
        message,
        action: { label: "Back to your bag", run: () => void navigateTo("/cart") },
      };

    case ERROR_CODES.invalidQuantity:
      return {
        message,
        action: { label: "Review your bag", run: () => void navigateTo("/cart") },
      };

    case ERROR_CODES.invalidPaymentMethod:
      return {
        message,
        action: {
          label: "Choose another method",
          run: () => {
            payment.value = null;
            step.value = 3;
            failure.value = null;
          },
        },
      };

    case ERROR_CODES.invalidAddress:
      return { message, action: { label: "Check your address", run: goTo2 } };

    default:
      // No code at all means a genuine failure with nothing useful to say.
      return {
        message:
          code && message
            ? message
            : "Something went wrong placing your order. Please try again.",
      };
  }
};

const submit = async (method: PaymentMethod) => {
  if (placing.value) return;
  placing.value = true;
  failure.value = null;

  const placed = address.value;
  frozen.value = {
    items: [...items.value],
    count: count.value,
    subtotal: subtotal.value,
  };

  try {
    // `rate_id` is only ever an assertion — the database re-resolves the fee
    // from the address and raises `rate_mismatch` if the two disagree. It is
    // omitted entirely when the destination is unpriced.
    const order = await placeOrder(
      placed,
      method,
      quoteQuery.data.value?.rate_id ?? undefined,
    );

    if (saveDetails.value) savedAddress.remember(placed);

    await navigateTo(
      `/order/confirmed?ref=${encodeURIComponent(order.order_number)}`,
    );
  } catch (error) {
    log.error("place order failed", error);
    // The bag was never emptied, so let the live figures back through.
    frozen.value = null;
    failure.value = describe(error);
    scrollToTop();
  } finally {
    placing.value = false;
  }
};

/** Only reached when the mounted fields of the current step all validate. */
const advance = () => {
  if (step.value < 3) {
    step.value += 1;
    scrollToTop();
    return;
  }

  // The radio group does not register with AppForm, so it is checked here.
  const method = payment.value;
  if (!method) {
    attempted[3] = true;
    return;
  }

  void submit(method);
};

usePageSeo({
  title: "Checkout",
  description:
    "Complete your order. Bank transfer or pay on delivery, insured delivery across Nigeria.",
  path: "/checkout",
  robots: "noindex, nofollow",
});
</script>

<style scoped>
.co {
  padding-block: 24px 64px;
}

.co__layout {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.co__main {
  display: flex;
  flex-direction: column;
  gap: 28px;
  min-width: 0;
}

/* ── Header ──────────────────────────────────────────────────────────── */

.co__head {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.co__meta {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.co__bars {
  display: flex;
  gap: 4px;
}

.co__bar {
  flex: 1;
  height: 1px;
  background: var(--border-default);
  transition: background-color var(--dur-hover) var(--ease-brand);
}

.co__bar--on {
  background: var(--text-primary);
}

.co__title {
  margin: 0;
  font-size: clamp(26px, 6vw, 32px);
  line-height: 1.05;
}

/* ── Fields ──────────────────────────────────────────────────────────── */

.co__fields {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.co__back {
  align-self: flex-start;
}

/* ── Summary aside ───────────────────────────────────────────────────── */

.co__aside {
  min-width: 0;
}

.co__lines {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin: 0;
  padding: 0 0 4px;
  list-style: none;
}

.co__line {
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-default);
}

.co__line:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.co__cta {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 4px;
}

.co__failure {
  display: flex;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--color-error);
  border-radius: var(--radius-brand);
  background: var(--surface);
}

.co__failure-icon {
  flex: 0 0 auto;
  margin-top: 2px;
  color: var(--color-error);
}

.co__failure-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
  min-width: 0;
}

.co__failure-message {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: var(--text-primary);
}

.co__reassure {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  text-align: center;
  color: var(--text-muted);
}

@media (min-width: 1024px) {
  .co__layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px;
    gap: 48px;
    align-items: start;
  }

  .co__aside {
    position: sticky;
    /* Clears the glass header without a magic number of its own. */
    top: calc(80px + var(--top));
  }
}
</style>
