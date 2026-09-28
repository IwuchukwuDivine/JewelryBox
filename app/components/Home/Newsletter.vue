<template>
  <AppContainer as="section" class="news">
    <h2 class="display-heading news__title">Enter the world of JewelryBox.</h2>

    <p class="news__body">
      Private previews and the occasional letter from the house.
    </p>

    <form class="news__form" novalidate @submit.prevent="submit">
      <div class="news__row" :class="{ 'news__row--error': error }">
        <label class="sr-only" :for="fieldId">Email address</label>
        <input
          :id="fieldId"
          v-model="email"
          class="app-field__control news__input"
          type="email"
          name="email"
          autocomplete="email"
          placeholder="Email address"
          :aria-invalid="error ? 'true' : undefined"
          :aria-describedby="error ? messageId : undefined"
          @input="error = ''"
        >

        <button type="submit" class="news__submit">Enter &rarr;</button>
      </div>

      <p v-if="error" :id="messageId" class="app-field__error news__message">
        {{ error }}
      </p>
    </form>
  </AppContainer>
</template>

<script setup lang="ts">
import { emailRules } from "~/utils/rules";

/**
 * The house letter.
 *
 * There is no subscriber backend yet, so this validates, reports the event and
 * thanks the customer — it deliberately does not pretend an address was
 * stored. Wire it to a list when one exists; the event name is already the one
 * analytics expects.
 */
const { track } = useTag();

const uid = useId() ?? "";
const fieldId = `news-email-${uid}`;
const messageId = `${fieldId}-message`;

const email = ref("");
const error = ref("");

const submit = () => {
  const failed = emailRules.find((entry) => !entry.rule(email.value));
  if (failed) {
    error.value = failed.message;
    return;
  }

  error.value = "";
  email.value = "";

  track("newsletter_subscribe", { already_subscribed: false });
  useToast("success", "Welcome to the house.");
};
</script>

<style scoped>
.news {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 64px;
}

.news__title {
  max-width: 24ch;
  margin: 0;
  font-size: clamp(30px, 4vw, 40px);
  line-height: 1.1;
  text-wrap: balance;
}

.news__body {
  max-width: 44ch;
  margin: 0;
  font-size: 14px;
  line-height: 1.55;
  color: var(--text-secondary);
}

/* The underline belongs to the row, not the input, so the rule runs behind the
   submit button too — the single line the design calls for. */
.news__row {
  display: flex;
  align-items: center;
  max-width: 420px;
  border-bottom: 1px solid var(--text-secondary);
  transition: border-color var(--dur-hover) var(--ease-brand);
}

.news__row:focus-within {
  border-bottom-color: var(--accent);
}

.news__row--error {
  border-bottom-color: var(--color-error);
}

.news__input {
  flex: 1;
  min-width: 0;
  padding: 14px 0;
  border-bottom: 0;
}

.news__submit {
  flex: 0 0 auto;
  padding: 0 0 0 12px;
  border: none;
  background: none;
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-primary);
  cursor: pointer;
  transition: opacity var(--dur-hover) var(--ease-brand);
}

.news__submit:hover {
  opacity: 0.7;
}

.news__submit:focus-visible {
  outline: 2px solid var(--ring-default);
  outline-offset: 2px;
}

.news__message {
  margin: 8px 0 0;
}

@media (min-width: 768px) {
  .news {
    padding-top: 88px;
  }
}
</style>
