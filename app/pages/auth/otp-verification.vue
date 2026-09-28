<template>
  <AuthCard
    title="Confirm your email"
    :subtitle="`We sent a six-digit code to ${email || 'your email address'}. Enter it below.`"
  >
    <div class="otp">
      <AppOTPInput v-model="code" :disabled="loading" @complete="onVerify" />

      <AuthFormError :message="error" />

      <AppButton
        block
        size="lg"
        :loading="loading"
        :disabled="code.length !== 6"
        @click="onVerify(code)"
      >
        Verify email
      </AppButton>

      <button
        type="button"
        class="otp__resend"
        :disabled="cooldown > 0 || resending"
        @click="onResend"
      >
        <template v-if="cooldown > 0">Resend code in {{ cooldown }}s</template>
        <template v-else-if="resending">Sending…</template>
        <template v-else>Resend code</template>
      </button>
    </div>

    <template #footer>
      <span>
        Wrong email?
        <NuxtLink class="text-link" to="/auth/signup">Start over</NuxtLink>
      </span>
    </template>
  </AuthCard>
</template>

<script setup lang="ts">
/**
 * The gate a new account passes through.
 *
 * No `guest` guard: `verifyOtp()` adopts the session and navigates from
 * inside `useAuth()`, so a guard here would race its own success.
 */
definePageMeta({ layout: "auth" });

const route = useRoute();
const { verifyOtp, resendOtp } = useAuth();

const email = computed(() => String(route.query.email ?? ""));
const code = ref("");
const loading = ref(false);
const resending = ref(false);
const error = ref("");

/**
 * The visible clock is presentational. The real limit is one send per minute
 * per address, held server-side, and it survives a reload — so a refusal is
 * always possible even at zero, and its own sentence is what gets rendered.
 */
const cooldown = ref(0);
let cooldownTimer: ReturnType<typeof setInterval> | null = null;

const startCooldown = () => {
  if (cooldownTimer) clearInterval(cooldownTimer);
  cooldown.value = 60;
  cooldownTimer = setInterval(() => {
    cooldown.value -= 1;
    if (cooldown.value <= 0 && cooldownTimer) clearInterval(cooldownTimer);
  }, 1000);
};

onMounted(startCooldown);
onUnmounted(() => {
  if (cooldownTimer) clearInterval(cooldownTimer);
});

const onVerify = async (token: string) => {
  if (loading.value || token.length !== 6) return;

  loading.value = true;
  error.value = "";

  try {
    // Adopts the session and lands the customer; nothing to route here.
    await verifyOtp(email.value, token);
  } catch (err) {
    const stated = err instanceof Error ? err.message : "";
    const codeOf = errorCode(err);

    if (codeOf === ERROR_CODES.invalidCredentials) {
      // Wrong digits. The code stays reachable — clear the boxes to retype.
      error.value = stated || "That code is not right. Check it and try again.";
    } else if (codeOf === ERROR_CODES.otpExpired) {
      // Past fifteen minutes. A new code is the only way forward.
      error.value = stated || "That code has expired. Request a new one.";
    } else {
      error.value = "We could not verify the code. Try again in a moment.";
    }

    code.value = "";
  } finally {
    loading.value = false;
  }
};

const onResend = async () => {
  resending.value = true;
  error.value = "";

  try {
    await resendOtp(email.value);
    useToast("success", "A new code is on its way.");
    startCooldown();
  } catch (err) {
    if (errorCode(err) === ERROR_CODES.otpRateLimited) {
      /**
       * The server refused. Its sentence states the wait; the number in it is
       * prose that will be reworded, so it is never parsed — the clock below
       * is our own, and restarting it stops the button being hammered.
       */
      error.value =
        err instanceof Error
          ? err.message
          : "Too many requests. Wait a moment before asking for another code.";
      startCooldown();
    } else {
      error.value = "We could not send another code. Try again in a moment.";
    }
  } finally {
    resending.value = false;
  }
};

usePageSeo({
  title: "Confirm your email",
  description: "Enter the six-digit code sent to your email address.",
  path: "/auth/otp-verification",
  robots: "noindex, nofollow",
});
</script>

<style scoped>
.otp {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.otp__resend {
  align-self: center;
  padding: 0;
  border: none;
  background: none;
  font-family: var(--font-mono);
  font-size: 10px;
  line-height: 1;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-primary);
  cursor: pointer;
  transition: opacity var(--dur-hover) var(--ease-brand);
}

.otp__resend:hover:not(:disabled) {
  opacity: 0.7;
}

.otp__resend:disabled {
  color: var(--text-muted);
  cursor: default;
}

.otp__resend:focus-visible {
  outline: 2px solid var(--ring-default);
  outline-offset: 4px;
}
</style>
