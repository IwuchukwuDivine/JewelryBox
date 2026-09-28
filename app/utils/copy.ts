export default async (text: string) => {
  try {
    // Check if clipboard API is available
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      useToast("error", "Clipboard not available");
      return false;
    }
    await navigator.clipboard.writeText(text);
    useToast("success", "Copied to clipboard");
    return true;
  } catch (err) {
    log.error(err);
    useToast("error", "Failed to copy to clipboard");
    return false;
  }
};
