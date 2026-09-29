<template>
  <section class="luxe-card auth-card">
    <header class="auth-card__head">
      <h1 class="display-heading auth-card__title">{{ title }}</h1>
      <p v-if="subtitle" class="auth-card__subtitle">{{ subtitle }}</p>
    </header>

    <div class="auth-card__body">
      <slot />
    </div>

    <footer v-if="$slots.footer" class="auth-card__footer">
      <slot name="footer" />
    </footer>
  </section>
</template>

<script setup lang="ts">
/**
 * The frame every auth form is set in.
 *
 * One card, 420px, a Marcellus heading and a single sentence beneath it. The
 * footer is where the way out lives — the other account, the other flow —
 * separated by a hairline so it never reads as part of the form.
 */
defineProps<{
  title: string;
  subtitle?: string;
}>();
</script>

<style scoped>
.auth-card {
  display: flex;
  flex-direction: column;
  gap: 24px;
  /* `min()` rather than width + max-width: the card is laid out as a flex
     item, where a percentage width alone lets a short card shrink to its
     content and drift off the 420px measure. */
  width: min(100%, 420px);
  padding: 28px 22px;
}

.auth-card__head {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.auth-card__title {
  margin: 0;
  font-size: 30px;
  line-height: 1.1;
}

.auth-card__subtitle {
  margin: 0;
  font-size: 14px;
  line-height: 1.55;
  color: var(--text-secondary);
}

.auth-card__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.auth-card__footer {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 20px;
  border-top: 1px solid var(--border-default);
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-secondary);
}

@media (min-width: 480px) {
  .auth-card {
    padding: 32px 28px;
  }
}
</style>
