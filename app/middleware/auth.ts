/** Requires a session. Apply with `definePageMeta({ middleware: "auth" })`. */
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return;

  const { ready, isLoggedIn } = useAuth();
  await ready();

  if (isLoggedIn.value) return;

  const target = `/auth/login?redirect=${encodeURIComponent(to.fullPath)}`;

  /**
   * On the very first render the server has already committed this page's
   * layout to the DOM. `/auth/*` sits in a different layout, so redirecting
   * inside hydration mounts one tree into another's markup and Vue gives up
   * on the page. Handing the first redirect to the browser keeps the guard's
   * behaviour and lets the sign-in page render as itself.
   */
  if (useNuxtApp().isHydrating) {
    return navigateTo(target, { replace: true, external: true });
  }

  return navigateTo(target);
});
