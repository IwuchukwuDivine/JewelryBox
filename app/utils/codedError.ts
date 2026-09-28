import type { ErrorCode } from "~/utils/constants/errorCodes";

/**
 * Build an error carrying a stable machine code, so callers branch on the
 * code rather than on the message. Both lanes throw these: the mock
 * repositories directly, the Supabase ones by mapping a `PostgrestError`
 * `hint` or a GoTrue `error_code`.
 */
export default (code: ErrorCode, message: string): Error =>
  Object.assign(new Error(message), { code });
