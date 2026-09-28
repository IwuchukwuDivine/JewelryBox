<template>
  <AuthCard
    title="Welcome back"
    subtitle="Sign in to follow an order and keep your saved pieces."
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

      <AppInput
        v-model="password"
        label="Password"
        type="password"
        placeholder="Your password"
        autocomplete="current-password"
        required
        :rules="requiredRules"
      />

      <AuthFormError :message="error" />

      <AppButton
        type="submit"
        block
        size="lg"
        :loading="loading"
        :disabled="!formValid"
      >
        Sign in
      </AppButton>
    </AppForm>

    <template #footer>
      <NuxtLink class="text-link" to="/auth/forgot-password">
        Forgot your password
      </NuxtLink>
      <span>
        New to the house?
        <NuxtLink class="text-link" to="/auth/signup">Create an account</NuxtLink>
      </span>
    </template>
  </AuthCard>
</template>

<script setup lang="ts">
definePageMeta({ layout: "auth", middleware: "guest" });

const { signIn, postAuthTarget } = useAuth();

const email = ref("");
const password = ref("");
const formValid = ref(false);
const loading = ref(false);
const error = ref("");

const onSubmit = async () => {
  loading.value = true;
  error.value = "";

  try {
    await signIn(email.value, password.value);
    // The redirect `auth.ts` attached, else admin, else home.
    await navigateTo(postAuthTarget());
  } catch (err) {
    const code = errorCode(err);

    if (code === ERROR_CODES.emailNotConfirmed) {
      // The account exists but was never confirmed. Retyping the password
      // can never fix that, so the customer goes to the code instead.
      await navigateTo(
        `/auth/otp-verification?email=${encodeURIComponent(email.value)}`,
      );
      return;
    }

    // `invalid_credentials` states its own fix, so it is shown as written.
    // Anything uncoded is a genuine failure: say try again.
    error.value =
      code === ERROR_CODES.invalidCredentials && err instanceof Error
        ? err.message
        : "We could not sign you in. Try again in a moment.";
  } finally {
    loading.value = false;
  }
};

usePageSeo({
  title: "Sign in",
  description: "Sign in to your JewelryBox account.",
  path: "/auth/login",
  robots: "noindex, nofollow",
});
</script>
