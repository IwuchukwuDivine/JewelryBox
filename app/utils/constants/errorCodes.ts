/**
 * Stable machine codes carried on thrown repository errors.
 *
 * The seam rule in `types/api.ts` is that nothing leaks a `PostgrestError` —
 * but until now it said nothing about what a repository throws *instead*, so
 * every error path was unbranchable and the UI could only say "try again".
 *
 * A repository attaches one of these to the thrown error via `codedError()`;
 * the UI reads it with `errorCode()` and never matches on message text. The
 * human sentence lives in `message`, written once at the source so the two
 * lanes cannot drift.
 *
 * Postgres side: `raise exception '…' using hint = 'sold_out'`. `hint` is a
 * structured field on `PostgrestError`, so the repository maps `hint` into the
 * code without parsing prose, and no custom SQLSTATEs are invented.
 * Auth side: GoTrue's own `error_code` values, passed through unchanged.
 */

export const ERROR_CODES = {
  /* Ordering — raised by `place_order` */
  soldOut: "sold_out",
  /** The piece is gone. Remove the line. */
  productUnavailable: "product_unavailable",
  /** The option is gone, the piece is not. Pick another variant. */
  variantUnavailable: "variant_unavailable",
  rateMismatch: "rate_mismatch",
  orderRateLimited: "order_rate_limited",
  emptyCart: "empty_cart",
  invalidAddress: "invalid_address",
  /** Line outside 1–99, more than 50 lines, or more than 200 units. */
  invalidQuantity: "invalid_quantity",
  invalidPaymentMethod: "invalid_payment_method",

  /* Admin — raised by `advance_order_status` */
  notAdmin: "not_admin",
  orderNotFound: "order_not_found",
  /** UI and database disagree about the flow. Retrying will never work. */
  illegalTransition: "illegal_transition",

  /* Guest tracking — raised by `lookup_order` */
  lookupRateLimited: "lookup_rate_limited",

  /* Auth — GoTrue's own codes, not ours to rename */
  otpRateLimited: "over_email_send_rate_limit",
  invalidCredentials: "invalid_credentials",
  otpExpired: "otp_expired",
  /**
   * Signed in with an address that was never verified. The ONLY repair is to
   * finish verification, so the UI must route to /auth/otp-verification —
   * falling through to "try again" leaves the customer with no way out.
   */
  emailNotConfirmed: "email_not_confirmed",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
