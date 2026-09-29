<template>
  <div class="error-page">
    <div class="error-page__card">
      <p class="error-page__code display-heading">
        {{ error?.statusCode ?? 500 }}
      </p>

      <h1 class="error-page__title display-heading">{{ title }}</h1>

      <p class="error-page__message">{{ message }}</p>

      <button type="button" class="btn-solid error-page__action" @click="handleBack">
        Return Home
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NuxtError } from "#app";

const props = defineProps<{ error: NuxtError }>();

const title = computed(() =>
  props.error?.statusCode === 404 ? "This page is not here." : "Something stopped short.",
);

const message = computed(() =>
  props.error?.statusCode === 404
    ? "The page has moved, or the link was never ours."
    : "The request did not complete. Try it again in a moment.",
);

const handleBack = () => clearError({ redirect: "/" });
</script>

<style scoped>
.error-page {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(24px + var(--top)) calc(24px + var(--right))
    calc(24px + var(--bottom)) calc(24px + var(--left));
  background: var(--surface);
  font-family: var(--font-body);
}

.error-page__card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
  max-width: 420px;
}

.error-page__code {
  margin: 0;
  font-size: 56px;
  line-height: 1;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

.error-page__title {
  margin: 0;
  font-size: 30px;
  line-height: 1.1;
}

.error-page__message {
  margin: 0;
  font-size: 15px;
  line-height: 1.55;
  color: var(--text-secondary);
}

.error-page__action {
  margin-top: 8px;
}
</style>
