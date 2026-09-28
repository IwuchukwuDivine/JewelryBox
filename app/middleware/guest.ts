/**
 * Keeps a signed-in customer out of the sign-in pages.
 * Apply with `definePageMeta({ middleware: "guest" })`.
 *
 * The mirror of `auth.ts`: client-only, because the session is restored after
 * hydration by `plugins/auth.client.ts`, and `await ready()` before reading
 * `isLoggedIn` so a hard refresh does not race the restore.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return;

  const { ready, isLoggedIn, postAuthTarget } = useAuth();
  await ready();

  if (!isLoggedIn.value) return;

  /**
   * `postAuthTarget()` reads the route this composable captured at setup —
   * inside middleware that is the route being left, not `to`. So the redirect
   * that `auth.ts` attached is read off `to` here, with the same same-origin
   * guard, and `postAuthTarget()` remains the fallback.
   */
  const redirect = to.query.redirect;
  const target =
    typeof redirect === "string" && /^\/(?!\/)/.test(redirect)
      ? redirect
      : postAuthTarget();

  /**
   * On the very first render the server has already committed this page's
   * layout to the DOM. Redirecting inside hydration would mount a different
   * layout into it, and Vue tears the tree down rather than patch it. So the
   * first one is handed to the browser as a real navigation; every later
   * redirect is an ordinary client-side one.
   */
  if (useNuxtApp().isHydrating) {
    return navigateTo(target, { replace: true, external: true });
  }

  return navigateTo(target, { replace: true });
});
