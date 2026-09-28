/**
 * Copy text to the clipboard, reporting the outcome once.
 *
 * `successMessage` lets the caller name what was copied — "Wishlist link
 * copied", "Reference copied" — instead of toasting twice. Pass `null` to stay
 * silent when the UI already confirms it some other way (an inline "Copied"
 * flag on the button, say).
 *
 * Failures always toast: a copy that silently does nothing is worse than a
 * message, and the caller cannot see the clipboard to check.
 */
export default async (
  text: string,
  successMessage: string | null = "Copied to clipboard",
): Promise<boolean> => {
  try {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      useToast("error", "Clipboard not available");
      return false;
    }
    await navigator.clipboard.writeText(text);
    if (successMessage) useToast("success", successMessage);
    return true;
  } catch (err) {
    log.error(err);
    useToast("error", "Failed to copy to clipboard");
    return false;
  }
};
