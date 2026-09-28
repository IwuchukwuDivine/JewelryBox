<template>
  <p v-if="message" class="auth-error" role="alert">
    <span class="auth-error__rule" aria-hidden="true" />
    {{ message }}
  </p>
</template>

<script setup lang="ts">
/**
 * The server's answer, rendered where the customer is looking.
 *
 * Auth failures belong inside the form, next to the fields that caused them —
 * a toast slides away while the password is still wrong. The sentence comes
 * from the thrown error's `message`, written once at the source for the
 * customer; this only places it.
 */
defineProps<{ message?: string }>();
</script>

<style scoped>
.auth-error {
  display: flex;
  gap: 10px;
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--color-error);
}

.auth-error__rule {
  flex: 0 0 auto;
  width: 1px;
  background: var(--color-error);
}
</style>
