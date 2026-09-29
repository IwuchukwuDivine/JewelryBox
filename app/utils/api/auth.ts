import type { User } from "@supabase/supabase-js";
import type {
  AuthRepository,
  SessionUser,
  SignUpResult,
} from "~/utils/types/api";
import { getSupabase } from "~/utils/supabase";
import mapError from "~/utils/api/mapError";

/**
 * Auth and the profile row behind it.
 *
 * GoTrue owns the credentials; `profiles` owns `full_name`, `phone` and `role`,
 * written by the `handle_new_user()` trigger on the `auth.users` insert — which
 * fires at signup, before verification, so the row exists by the time a session
 * first appears.
 *
 * Errors pass GoTrue's own codes through: `invalid_credentials`, `otp_expired`
 * and `over_email_send_rate_limit` are all values in `ERROR_CODES`, so
 * `mapError()` forwards them and the UI branches on them directly. Anything
 * else — a weak password, a malformed reset request — is deliberately uncoded.
 */

/** Where the emailed recovery link sends the customer back to. */
const RESET_PATH = "/auth/reset-password";

const normaliseEmail = (email: string): string => email.trim().toLowerCase();

/**
 * Session plus profile. Two reads, not one: the JWT carries the id and email,
 * and `full_name` / `phone` / `role` are editable after signup so they are read
 * from the table rather than from stale token claims.
 */
const toSessionUser = async (user: User): Promise<SessionUser> => {
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("full_name, phone, role")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw mapError(error);

  return {
    id: user.id,
    email: user.email ?? "",
    full_name: data?.full_name ?? null,
    phone: data?.phone ?? null,
    // Never read from user metadata: that is client-writable. `role` lives on a
    // row an ordinary session cannot change (`protect_profile_role()`).
    is_admin: data?.role === "admin",
  };
};

export const supabaseAuthRepo: AuthRepository = {
  async current(): Promise<SessionUser | null> {
    const { data, error } = await getSupabase().auth.getSession();
    if (error) throw mapError(error);
    const user = data.session?.user;
    return user ? toSessionUser(user) : null;
  },

  async signIn(email: string, password: string): Promise<SessionUser> {
    const { data, error } = await getSupabase().auth.signInWithPassword({
      email: normaliseEmail(email),
      password,
    });
    if (error) throw mapError(error);
    if (!data.user) throw new Error("Sign in failed. Please try again.");
    return toSessionUser(data.user);
  },

  /**
   * Email confirmation is ON, so a fresh account gets a user and **no session**
   * until the code is entered — which is exactly what `needsVerification`
   * reports. Both fields are returned rather than inferred so the verification
   * screen never has to guess from a null.
   */
  async signUp(input: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
  }): Promise<SignUpResult> {
    const email = normaliseEmail(input.email);
    const { data, error } = await getSupabase().auth.signUp({
      email,
      password: input.password,
      options: {
        // Read by `handle_new_user()` to seed the profile row.
        data: { full_name: input.full_name, phone: input.phone ?? null },
      },
    });
    if (error) throw mapError(error);

    return {
      user: data.session && data.user ? await toSessionUser(data.user) : null,
      needsVerification: !data.session,
      email,
    };
  },

  /** `type: "signup"` — this is the confirmation code, not a magic link. */
  async verifyOtp(email: string, token: string): Promise<SessionUser> {
    const { data, error } = await getSupabase().auth.verifyOtp({
      email: normaliseEmail(email),
      token: token.trim(),
      type: "signup",
    });
    if (error) throw mapError(error);
    if (!data.user) {
      throw new Error("That code could not be confirmed. Request a new one.");
    }
    return toSessionUser(data.user);
  },

  /**
   * Throttled by GoTrue itself (`max_frequency = "60s"` in `config.toml`), which
   * answers `over_email_send_rate_limit`. That is the control — a client-side
   * cooldown is only cosmetic, since a reload would clear it.
   */
  async resendOtp(email: string): Promise<void> {
    const { error } = await getSupabase().auth.resend({
      type: "signup",
      email: normaliseEmail(email),
    });
    if (error) throw mapError(error);
  },

  async signOut(): Promise<void> {
    const { error } = await getSupabase().auth.signOut();
    if (error) throw mapError(error);
  },

  async requestPasswordReset(email: string): Promise<void> {
    const siteUrl = useRuntimeConfig().public.siteUrl;
    const { error } = await getSupabase().auth.resetPasswordForEmail(
      normaliseEmail(email),
      { redirectTo: `${siteUrl}${RESET_PATH}` },
    );
    if (error) throw mapError(error);
  },

  /** Called from the recovery session the emailed link establishes. */
  async resetPassword(password: string): Promise<void> {
    const { error } = await getSupabase().auth.updateUser({ password });
    if (error) throw mapError(error);
  },

  async updateProfile(input: {
    full_name?: string;
    phone?: string;
  }): Promise<SessionUser> {
    const sb = getSupabase();
    const { data: session, error: sessionError } = await sb.auth.getSession();
    if (sessionError) throw mapError(sessionError);
    const user = session.session?.user;
    if (!user) throw new Error("You are not signed in.");

    // Only the keys actually supplied: a `PATCH` carrying `phone: undefined`
    // would otherwise be sent as an explicit null and wipe a stored number.
    const patch = {
      ...(input.full_name !== undefined ? { full_name: input.full_name } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
    };

    if (Object.keys(patch).length) {
      // `Update own profile` scopes this to the caller's row; the `eq` is what
      // makes the statement address one row rather than relying on the policy.
      const { error } = await sb.from("profiles").update(patch).eq("id", user.id);
      if (error) throw mapError(error);
    }

    return toSessionUser(user);
  },
};
