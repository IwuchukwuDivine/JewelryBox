import type { ErrorCode } from "~/utils/constants/errorCodes";

/**
 * Read the machine code off a thrown value, if it carries one.
 *
 * Returns `null` for a plain error, which the UI should treat as "a genuine
 * failure, say try again" rather than as an unrecognised branch.
 */
export default (error: unknown): ErrorCode | null => {
  if (!error || typeof error !== "object") return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? (code as ErrorCode) : null;
};
