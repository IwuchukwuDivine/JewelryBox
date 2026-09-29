import type { SessionUser } from "~/utils/types/api";

/**
 * Session. Every method throws on failure so the calling page can render the
 * message inline — auth errors belong next to the form, not in a toast.
 *
 * The house pattern on an auth page is:
 *   try { await signIn(...) } catch (e) { error = message(e) } finally { loading = false }
 */

let readyPromise: Promise<void> | null = null;

export default () => {
  const store = useAppStore();
  const route = useRoute();
  const { user, isLoggedIn, isAdmin, firstName } = storeToRefs(store);

  /** Resolve the session once per app load; concurrent callers share it. */
  const ready = (): Promise<void> => {
    if (!readyPromise) {
      readyPromise = authRepo
        .current()
        .then((current) => store.setUser(current))
        .catch((error) => {
          log.error("session restore failed", error);
          store.setUser(null);
        });
    }
    return readyPromise;
  };

  const adopt = (next: SessionUser) => {
    store.setUser(next);
    return next;
  };

  const signIn = async (email: string, password: string) =>
    adopt(await authRepo.signIn(email, password));

  /**
   * Signs up, then routes — mirroring BGI, which branches on whether Supabase
   * returned a session rather than assuming a setting:
   *
   *   user, no session  → confirmations are on  → /auth/otp-verification
   *   session           → confirmations are off → straight in
   *
   * Keeping the branch here means every auth page gets it right for free, and
   * flipping `enable_confirmations` later changes no page code.
   */
  const signUp = async (input: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
  }) => {
    const result = await authRepo.signUp(input);

    if (result.user) {
      adopt(result.user);
      await navigateTo(postAuthTarget());
    } else if (result.needsVerification) {
      await navigateTo(
        `/auth/otp-verification?email=${encodeURIComponent(result.email)}`,
      );
    }

    return result;
  };

  /** Exchanges the emailed code for a session, then lands the customer. */
  const verifyOtp = async (email: string, token: string) => {
    const verified = adopt(await authRepo.verifyOtp(email, token));
    await navigateTo(postAuthTarget());
    return verified;
  };

  const resendOtp = (email: string) => authRepo.resendOtp(email);

  const signOut = async () => {
    await authRepo.signOut();
    store.setUser(null);
    useWishlistStore().clear();
    await navigateTo("/");
  };

  const requestPasswordReset = (email: string) =>
    authRepo.requestPasswordReset(email);

  const resetPassword = (password: string) => authRepo.resetPassword(password);

  const updateProfile = async (input: { full_name?: string; phone?: string }) =>
    adopt(await authRepo.updateProfile(input));

  /**
   * Where to land after signing in: an explicit redirect, else admin, else home.
   *
   * The route is captured during setup, not read inside the getter — every
   * caller reaches this after an `await`, where Nuxt can no longer resolve
   * composables from the instance context.
   */
  const postAuthTarget = (): string => {
    const redirect = route.query.redirect;
    // Only same-origin paths; an absolute URL here would be an open redirect.
    if (typeof redirect === "string" && /^\/(?!\/)/.test(redirect)) return redirect;
    return isAdmin.value ? "/admin" : "/";
  };

  return {
    user,
    isLoggedIn,
    isAdmin,
    firstName,
    ready,
    signIn,
    signUp,
    verifyOtp,
    resendOtp,
    signOut,
    requestPasswordReset,
    resetPassword,
    updateProfile,
    postAuthTarget,
  };
};
