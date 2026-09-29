/**
 * Requires an admin session. Apply with `definePageMeta({ middleware: "admin" })`.
 *
 * The convenience, not the control: every admin read and write is gated by
 * `is_admin()` in RLS or inside the RPC, so a customer who forces a route sees
 * failing queries rather than data. This is what stops them seeing the shell.
 *
 * Client-only and `await ready()` before reading the session, exactly as
 * `auth.ts` does — the session is restored after hydration by
 * `plugins/auth.client.ts`, so a hard refresh would otherwise race the restore
 * and bounce a signed-in admin to the login page.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return;

  const { ready, isLoggedIn, isAdmin } = useAuth();
  await ready();

  if (isLoggedIn.value && isAdmin.value) return;

  const target = isLoggedIn.value
    ? "/"
    : `/auth/login?redirect=${encodeURIComponent(to.fullPath)}`;

  /**
   * On the very first render the server has already committed the admin layout
   * to the DOM, and both targets live in a different one — `/auth/login` in
   * `auth`, `/` in `default`. Redirecting inside hydration mounts one tree into
   * another's markup and Vue tears the page down rather than patch it. Handing
   * the first redirect to the browser keeps the guard's behaviour and lets the
   * destination render as itself.
   */
  if (useNuxtApp().isHydrating) {
    return navigateTo(target, { replace: true, external: true });
  }

  return navigateTo(target, { replace: true });
});
