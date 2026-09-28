<template>
  <AuthCard
    title="Open an account"
    subtitle="Keep your pieces saved, your addresses ready and every order in one place."
  >
    <AppForm v-model="formValid" :loading="loading" @submit="onSubmit">
      <AppInput
        v-model="fullName"
        label="Full name"
        placeholder="Adaeze Okonkwo"
        autocomplete="name"
        required
        :rules="nameRules"
      />

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
        v-model="phone"
        label="Phone"
        type="tel"
        placeholder="0803 000 0000"
        autocomplete="tel"
        :rules="phone ? phoneRules : []"
        hint="Optional. Used for delivery only."
      />

      <AppInput
        v-model="password"
        label="Password"
        type="password"
        placeholder="Create a password"
        autocomplete="new-password"
        required
        :rules="passwordRules"
        hint="Eight characters, with an upper case, a lower case and a number."
      />

      <AuthFormError :message="error" />

      <AppButton
        type="submit"
        block
        size="lg"
        :loading="loading"
        :disabled="!formValid"
      >
        Create account
      </AppButton>
    </AppForm>

    <template #footer>
      <span>
        Already with us?
        <NuxtLink class="text-link" to="/auth/login">Sign in</NuxtLink>
      </span>
    </template>
  </AuthCard>
</template>

<script setup lang="ts">
definePageMeta({ layout: "auth", middleware: "guest" });

const { signUp } = useAuth();

const fullName = ref("");
const email = ref("");
const phone = ref("");
const password = ref("");
const formValid = ref(false);
const loading = ref(false);
const error = ref("");

const onSubmit = async () => {
  loading.value = true;
  error.value = "";

  try {
    /**
     * Email confirmation is on, so this returns a `SignUpResult` rather than
     * a session. `useAuth()` owns the branch that follows — verification
     * screen or straight in — so this page routes nowhere itself.
     */
    await signUp({
      email: email.value,
      password: password.value,
      full_name: fullName.value,
      ...(phone.value ? { phone: phone.value } : {}),
    });
  } catch (err) {
    // Signup carries no code of its own; a coded error still states its own
    // fix, so it is shown as written.
    error.value =
      errorCode(err) && err instanceof Error
        ? err.message
        : "We could not open the account. Try again in a moment.";
  } finally {
    loading.value = false;
  }
};

usePageSeo({
  title: "Create account",
  description: "Open a JewelryBox account.",
  path: "/auth/signup",
  robots: "noindex, nofollow",
});
</script>
