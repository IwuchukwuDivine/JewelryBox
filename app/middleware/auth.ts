// Example route guard — apply with definePageMeta({ middleware: "auth" })
export default defineNuxtRouteMiddleware(() => {
  const { isLoggedIn } = useApp();
  if (!isLoggedIn.value) {
    return navigateTo("/");
  }
});
