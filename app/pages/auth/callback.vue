<template>
  <AuthCard title="One moment" subtitle="Finishing your sign-in.">
    <div class="landing">
      <AppSpinner size="72px" label="Signing you in" />
    </div>
  </AuthCard>
</template>

<script setup lang="ts">
/**
 * Where an emailed sign-in link lands.
 *
 * There is no OAuth in this build, so nothing is exchanged here: the session
 * is restored by `plugins/auth.client.ts`, this waits for it and sends the
 * customer on. No `guest` guard — a signed-in arrival is the normal case.
 *
 * TODO(phase-f): when Supabase is wired, the link's token is exchanged by the
 * client's `detectSessionInUrl` before `ready()` resolves, and a failed
 * exchange should show "link expired" here rather than routing home.
 */
definePageMeta({ layout: "auth" });

const { ready, postAuthTarget } = useAuth();

onMounted(async () => {
  await ready();
  await navigateTo(postAuthTarget(), { replace: true });
});

usePageSeo({
  title: "Signing in",
  description: "Completing your JewelryBox sign-in.",
  path: "/auth/callback",
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
