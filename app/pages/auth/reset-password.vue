<template>
  <AuthCard
    title="Set a new password"
    subtitle="Choose one you have not used here before."
  >
    <AppForm v-model="formValid" :loading="loading" @submit="onSubmit">
      <AppInput
        v-model="password"
        label="New password"
        type="password"
        placeholder="New password"
        autocomplete="new-password"
        required
        :rules="passwordRules"
        hint="Eight characters, with an upper case, a lower case and a number."
      />

      <AppInput
        v-model="confirm"
        label="Confirm password"
        type="password"
        placeholder="Repeat it"
        autocomplete="new-password"
        required
        :rules="confirmRules"
      />

      <AuthFormError :message="error" />

      <AppButton
        type="submit"
        block
        size="lg"
        :loading="loading"
        :disabled="!formValid"
      >
        Save password
      </AppButton>
    </AppForm>

    <template #footer>
      <NuxtLink class="text-link" to="/auth/login">Back to sign in</NuxtLink>
    </template>
  </AuthCard>
</template>

<script setup lang="ts">
/**
 * Reached from the emailed recovery link, which lands on `/auth/confirm` and
 * continues here — so no `guest` guard: the recovery link carries a session,
 * and bouncing it away is the one thing this page must not do.
 */
definePageMeta({ layout: "auth" });

const { resetPassword } = useAuth();

const password = ref("");
const confirm = ref("");
const formValid = ref(false);
const loading = ref(false);
const error = ref("");

/** `matches` takes a getter so it reads the partner field at validation time. */
const confirmRules = [...requiredRules, matches(() => password.value, "passwords")];

const onSubmit = async () => {
  loading.value = true;
  error.value = "";

  try {
    await resetPassword(password.value);
    useToast("success", "Password saved. Sign in with it.");
    await navigateTo("/auth/login", { replace: true });
  } catch (err) {
    error.value =
      errorCode(err) && err instanceof Error
        ? err.message
        : "We could not save the password. Try again in a moment.";
  } finally {
    loading.value = false;
  }
};

usePageSeo({
  title: "New password",
  description: "Set a new password for your JewelryBox account.",
  path: "/auth/reset-password",
  robots: "noindex, nofollow",
});
</script>
