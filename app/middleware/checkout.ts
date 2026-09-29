/**
 * Empty-bag guard. Apply with `definePageMeta({ middleware: "checkout" })`.
 *
 * Nothing else: checkout is open to guests, so this must not reach for a
 * session. The bag lives in localStorage, which the server cannot see, so the
 * check is client-only — the page itself holds its shape until mount.
 */
export default defineNuxtRouteMiddleware(() => {
  if (import.meta.server) return;

  const cart = useCartStore();
  if (cart.isEmpty) return navigateTo("/cart");
});
