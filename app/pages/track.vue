<template>
  <AppContainer as="main" narrow class="trk">
    <AppBreadcrumbs :items="crumbs" />

    <header class="trk__head">
      <p class="eyebrow">Order tracking</p>
      <h1 class="display-heading trk__title">Where is my piece?</h1>
      <p class="trk__lede">
        Your order number is in every email we have sent you — it looks like
        <span class="trk__sample">JB-7K3QMZ</span>. Give us that and the email
        address you ordered with.
      </p>
    </header>

    <AppForm v-model="formValid" class="trk__form" @submit="submit" @invalid="nudge">
      <AppInput
        v-model="form.reference"
        label="Order number"
        placeholder="JB-7K3QMZ"
        autocomplete="off"
        spellcheck="false"
        :rules="requiredRules"
        :error="errorFor(form.reference, requiredRules)"
        required
      />

      <AppInput
        v-model="form.email"
        label="Email"
        type="email"
        placeholder="you@example.com"
        autocomplete="email"
        :rules="emailRules"
        :error="errorFor(form.email, emailRules)"
        required
      />

      <AppButton type="submit" size="lg" block :loading="looking">
        Find my order
      </AppButton>
    </AppForm>

    <!-- A miss is a normal answer, not an error state. -->
    <p v-if="notFound" class="trk__miss" role="status">
      We could not match that pair. Order numbers and email addresses have to
      go together, so check both against the email we sent you — or
      <NuxtLink to="/contact" class="text-link">write to the house</NuxtLink>
      and we will find it for you.
    </p>

    <p v-else-if="failure" class="trk__failure" role="alert">{{ failure }}</p>
  </AppContainer>
</template>

<script setup lang="ts">
import type { Rule } from "~/utils/types/forms";

/**
 * Guest order tracking.
 *
 * Every order email's CTA is `{siteUrl}/track?ref=JB-XXXXXX`, baked into six
 * templates, so the reference arrives prefilled and only the email is typed.
 *
 * The order number is **never validated client-side beyond trimming**. The
 * database's `normalize_order_ref` canonicalises it with Crockford's decode
 * rules — `jb 0l1z2s`, `01iz2s` and `JB-01IZ2S` all find the same order,
 * folding L and I to 1 and O to 0. A regex here would reject input the server
 * would happily have accepted.
 */
const route = useRoute();
const lookup = useOrderLookup();

const crumbs = [{ label: "Home", to: "/" }, { label: "Track order" }];

const form = reactive({
  reference: String(route.query.ref ?? "").trim(),
  email: "",
});

const formValid = ref(false);
const attempted = ref(false);
const looking = ref(false);
const notFound = ref(false);
const failure = ref("");

const firstFailure = (value: string, rules: Rule[]) =>
  rules.find((entry) => !entry.rule(value))?.message ?? "";

const errorFor = (value: string, rules: Rule[]) =>
  attempted.value ? firstFailure(value, rules) : "";

const nudge = () => {
  attempted.value = true;
};

const submit = async () => {
  if (looking.value) return;
  looking.value = true;
  notFound.value = false;
  failure.value = "";

  try {
    const order = await lookup(form.reference.trim(), form.email.trim());

    // Not found is a normal answer from `lookup_order`, not a throw.
    if (!order) {
      notFound.value = true;
      return;
    }

    // The lookup remembered the device pointer, so /order/[id] resolves.
    await navigateTo(`/order/${encodeURIComponent(order.order_number)}`);
  } catch (error) {
    log.error("order lookup failed", error);
    const code = errorCode(error);
    failure.value =
      code === ERROR_CODES.lookupRateLimited && error instanceof Error
        ? error.message
        : "We could not check that just now. Please try again in a moment.";
  } finally {
    looking.value = false;
  }
};

usePageSeo({
  title: "Track your order",
  description:
    "Look up a JewelryBox order with your order number and the email address you ordered with.",
  path: "/track",
  // The page itself is private per-lookup, but the links out of it are ours.
  robots: "noindex, follow",
});
</script>

<style scoped>
.trk {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding-block: 24px 64px;
}

.trk__head {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.trk__title {
  margin: 0;
  font-size: clamp(26px, 6vw, 32px);
  line-height: 1.05;
}

.trk__lede {
  margin: 0;
  font-size: 15px;
  line-height: 1.6;
  color: var(--text-secondary);
}

.trk__sample {
  font-family: var(--font-mono);
  letter-spacing: 0.06em;
  color: var(--text-primary);
}

.trk__form {
  max-width: 420px;
}

.trk__miss,
.trk__failure {
  max-width: 420px;
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
}

.trk__miss {
  color: var(--text-secondary);
}

.trk__failure {
  padding: 12px 14px;
  border: 1px solid var(--color-error);
  border-radius: var(--radius-brand);
  color: var(--text-primary);
}
</style>
