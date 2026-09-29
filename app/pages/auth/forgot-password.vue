<template>
  <AuthCard
    v-if="!sent"
    title="Reset your password"
    subtitle="Give us the address on the account. A reset link follows."
  >
    <AppForm v-model="formValid" :loading="loading" @submit="onSubmit">
      <AppInput
        v-model="email"
        label="Email"
        type="email"
        placeholder="you@example.com"
        autocomplete="email"
        required
        :rules="emailRules"
      />

      <AuthFormError :message="error" />

      <AppButton
        type="submit"
        block
        size="lg"
        :loading="loading"
        :disabled="!formValid"
      >
        Send reset link
      </AppButton>
    </AppForm>

    <template #footer>
      <span>
        Remembered it?
        <NuxtLink class="text-link" to="/auth/login">Back to sign in</NuxtLink>
      </span>
    </template>
  </AuthCard>

  <AuthCard
    v-else
    title="Check your email"
    :subtitle="`If an account holds ${email}, a reset link is on its way. The link lasts one hour.`"
  >
    <AppButton block variant="outline" to="/auth/login">Back to sign in</AppButton>

    <template #footer>
      <span>
        Nothing arrived? Look in spam, or
        <button type="button" class="text-link" @click="sent = false">
          try another address
        </button>
      </span>
    </template>
  </AuthCard>
</template>

<script setup lang="ts">
definePageMeta({ layout: "auth", middleware: "guest" });

const { requestPasswordReset } = useAuth();

const email = ref("");
const formValid = ref(false);
const loading = ref(false);
const error = ref("");
/** The card swaps in place — navigating away would lose the address. */
const sent = ref(false);

const onSubmit = async () => {
  loading.value = true;
  error.value = "";

  try {
    await requestPasswordReset(email.value);
    sent.value = true;
  } catch (err) {
    error.value =
      errorCode(err) && err instanceof Error
        ? err.message
        : "We could not send the link. Try again in a moment.";
  } finally {
    loading.value = false;
  }
};

usePageSeo({
  title: "Reset password",
  description: "Request a password reset link for your JewelryBox account.",
  path: "/auth/forgot-password",
  robots: "noindex, nofollow",
});
</script>
