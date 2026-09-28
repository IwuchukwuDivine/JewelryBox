/**
 * Restore the session before the first guarded navigation.
 *
 * Client-only: the session lives with the auth repository, so the server
 * renders as a guest and the client reconciles. Route guards await
 * `ready()` rather than reading `isLoggedIn` cold, which is what stops a
 * signed-in customer being bounced to /auth/login on a hard refresh.
 */
export default defineNuxtPlugin(async () => {
  await useAuth().ready();
});
