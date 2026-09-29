/**
 * Analytics consent + typed event tracking.
 *
 * `gtag` is configured with `initMode: "manual"` and every consent flag
 * defaulted to denied, so the ~167 KB script is never downloaded for a
 * visitor who declines or has not answered. `initialize()` runs only on
 * an explicit grant.
 */
type EventPayloads = {
  cookie_consent: { choice: "granted" | "denied" };
  view_product: { slug: string; category: string; price: number };
  add_to_bag: { slug: string; price: number; quantity: number };
  remove_from_bag: { slug: string };
  begin_checkout: { value: number; items: number };
  wishlist_toggle: { slug: string; action: "add" | "remove" };
  filter_apply: { category: string; filter: string };
  share: { content_type: "product" | "collection" | "page"; slug?: string };
  newsletter_subscribe: { already_subscribed: boolean };
};

type EventName = keyof EventPayloads;
type ConsentChoice = "granted" | "denied";

const CONSENT_STORAGE_KEY = "jb-consent-v1";

const grantedConsent = {
  ad_user_data: "granted",
  ad_personalization: "granted",
  ad_storage: "granted",
  analytics_storage: "granted",
} as const;

const deniedConsent = {
  ad_user_data: "denied",
  ad_personalization: "denied",
  ad_storage: "denied",
  analytics_storage: "denied",
} as const;

export const readStoredConsent = (): ConsentChoice | null => {
  if (!import.meta.client) return null;
  try {
    const v = localStorage.getItem(CONSENT_STORAGE_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
};

const writeStoredConsent = (choice: ConsentChoice) => {
  if (!import.meta.client) return;
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, choice);
  } catch {
    /* localStorage unavailable (private mode, blocked cookies) — non-fatal */
  }
};

export default () => {
  const { gtag, initialize } = useGtag();

  const track = <K extends EventName>(name: K, params: EventPayloads[K]) => {
    gtag("event", name, params);
  };

  const grantConsent = () => {
    initialize();
    gtag("consent", "update", grantedConsent);
    writeStoredConsent("granted");
    track("cookie_consent", { choice: "granted" });
  };

  const denyConsent = () => {
    gtag("consent", "update", deniedConsent);
    writeStoredConsent("denied");
  };

  /** Re-apply a previous decision on load. Call once, client-side. */
  const restoreStoredConsent = () => {
    const stored = readStoredConsent();
    if (stored === "granted") {
      initialize();
      gtag("consent", "update", grantedConsent);
    } else if (stored === "denied") {
      gtag("consent", "update", deniedConsent);
    }
  };

  return { track, grantConsent, denyConsent, restoreStoredConsent, readStoredConsent };
};
