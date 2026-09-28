<template>
  <ClientOnly>
    <Transition name="consent">
      <div v-if="visible" class="consent" role="dialog" aria-label="Cookie preferences">
        <p class="consent__text">
          We use analytics to understand how the collection is browsed. Nothing
          is loaded until you accept.
        </p>
        <div class="consent__actions">
          <button type="button" class="btn-outline consent__btn" @click="decline">
            Decline
          </button>
          <button type="button" class="btn-solid consent__btn" @click="accept">
            Accept
          </button>
        </div>
      </div>
    </Transition>
  </ClientOnly>
</template>

<script setup lang="ts">
/**
 * Consent gate for GA4.
 *
 * `gtag` runs with `initMode: "manual"` and every consent flag denied, so
 * the script is not downloaded until Accept is pressed. Client-only: the
 * decision lives in localStorage, which the server cannot read.
 */
const { grantConsent, denyConsent, restoreStoredConsent, readStoredConsent } = useTag();

const visible = ref(false);

/** No measurement ID configured means there is nothing to consent to. */
const gtagEnabled = computed(
  () => !!useRuntimeConfig().public.gtag?.id,
);

onMounted(() => {
  if (!gtagEnabled.value) return;
  restoreStoredConsent();
  visible.value = readStoredConsent() === null;
});

const accept = () => {
  grantConsent();
  visible.value = false;
};

const decline = () => {
  denyConsent();
  visible.value = false;
};
</script>

<style scoped>
.consent {
  position: fixed;
  z-index: 60;
  right: calc(1rem + var(--right));
  bottom: calc(1rem + var(--bottom));
  left: calc(1rem + var(--left));
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 28rem;
  margin-left: auto;
  padding: 1.25rem;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-brand);
  background: var(--glass);
  backdrop-filter: blur(12px);
  color: var(--text-primary);
}

.consent__text {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--text-secondary);
}

.consent__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.625rem;
}

.consent__btn {
  padding-top: 0.75rem;
  padding-bottom: 0.75rem;
}

.consent-enter-active,
.consent-leave-active {
  transition:
    opacity var(--dur-reveal) var(--ease-brand),
    transform var(--dur-reveal) var(--ease-brand);
}
.consent-enter-from,
.consent-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>
