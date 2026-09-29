import type { ErrorCode } from "~/utils/constants/errorCodes";

/**
 * The single place a Supabase failure becomes a repository error.
 *
 * `types/api.ts` forbids leaking a `PostgrestError`, and the error contract
 * says what goes out instead: an `Error` carrying a stable machine code the UI
 * can branch on, with the human sentence written once at the source.
 *
 * Two sources of a code, in this order:
 *
 *   · Postgres. Every `raise exception` in the migration carries its code in
 *     `using hint = '…'` and its customer-facing sentence in the message, so
 *     `hint` is read as the code and nothing string-matches prose.
 *   · GoTrue. Auth errors already carry their own `code`
 *     (`invalid_credentials`, `otp_expired`, `over_email_send_rate_limit`),
 *     which are values in `ERROR_CODES` and pass through unchanged.
 *
 * Anything else — an RLS refusal, a constraint violation, a dropped
 * connection — is deliberately uncoded. `errorCode()` returns null for it and
 * the UI says "try again", which is the right answer for a failure with no
 * distinct repair.
 */

/** Structural shape shared by `PostgrestError`, `AuthError` and `StorageError`. */
export interface SupabaseErrorLike {
  message: string;
  /** Postgres exception HINT — where every raise in the migration puts its code. */
  hint?: string | null;
  /** SQLSTATE under PostgREST; GoTrue's own `error_code` under auth. */
  code?: string | null;
}

const GENERIC_MESSAGE = "Something went wrong on our end. Please try again.";

/**
 * Matched against `ERROR_CODES` rather than a local list, so a code the
 * database raises that the constants file does not declare cannot be
 * smuggled through — it falls back to the generic error and shows up in
 * the dev log instead.
 */
const knownCode = (value: string | null | undefined): ErrorCode | null =>
  Object.values(ERROR_CODES).find((code) => code === value) ?? null;

export default (error: SupabaseErrorLike): Error => {
  const code = knownCode(error.hint) ?? knownCode(error.code);
  if (code) return codedError(code, error.message);

  // Never re-thrown, never attached as `cause`: the contract is that nothing
  // downstream of a repository can see a Supabase error object.
  log.error("[api] unmapped Supabase error:", error);
  return new Error(GENERIC_MESSAGE);
};
