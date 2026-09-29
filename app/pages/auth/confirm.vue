<template>
  <AuthCard title="Confirming" subtitle="Checking your link.">
    <div class="landing">
      <AppSpinner size="72px" label="Checking your link" />
    </div>
  </AuthCard>
</template>

<script setup lang="ts">
/**
 * Where an emailed confirmation or recovery link lands.
 *
 * A recovery link continues to the reset form; everything else is a
 * confirmed address, so the customer goes where they were headed.
 *
 * TODO(phase-f): with Supabase wired, the token in the URL is exchanged by
 * `detectSessionInUrl` before `ready()` resolves. An invalid or expired link
 * should then render "link expired" with a way to request a new one, rather
 * than routing on.
 */
definePageMeta({ layout: "auth" });

const route = useRoute();
const { ready, postAuthTarget } = useAuth();

onMounted(async () => {
  await ready();

  if (route.query.type === "recovery") {
    await navigateTo("/auth/reset-password", { replace: true });
    return;
  }

  await navigateTo(postAuthTarget(), { replace: true });
});

usePageSeo({
  title: "Confirming",
  description: "Confirming your JewelryBox account email.",
  path: "/auth/confirm",
  robots: "noindex, nofollow",
});
</script>

<style scoped>
.landing {
  display: flex;
  justify-content: center;
  padding: 8px 0 4px;
}
</style>
