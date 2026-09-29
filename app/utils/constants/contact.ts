/**
 * The house's real contact points, in one place.
 *
 * Supplied by the vendor and mirrored by the backend lane into
 * `site_settings` (keys `contact`, `whatsapp`, `instagram`, all
 * `is_public = true`), so an admin can change them without a deploy.
 *
 * TODO(Phase F): `types/api.ts` has only `AdminSettingsRepository` — an
 * admin-scoped, untyped `get(key)`. A *public* settings read is a contract
 * amendment, not a swap. Until it exists these are compile-time constants and
 * a number change needs a deploy. When the amendment lands, the surfaces that
 * should read it are the contact page and the order help card; the WhatsApp
 * float, which must render before hydration, can keep the constant.
 *
 * Do not add a `stkn=` query to the Instagram URL. That parameter is a
 * per-share session token that came attached to the link the vendor pasted —
 * it is not part of the handle and must not be stored or rendered.
 */
import type { PublicSettings } from "~/utils/types/api";

/** E.164 without the `+`. This is the only form `wa.me` accepts. */
export const WHATSAPP_NUMBER = "2348136232942";

/** Human form, for a `tel:` link or a detail row. */
export const WHATSAPP_DISPLAY = "+234 813 623 2942";

/**
 * Receives mail. `hello@jewelrybox.ng` deliberately does NOT appear anywhere
 * on the site: the domain is verified in Resend for *sending* only, which adds
 * no MX records, so anything addressed to it bounces. Every order email sets
 * this address as its reply-to for the same reason.
 */
export const CONTACT_EMAIL = "hello.jewelryboxng@gmail.com";

export const INSTAGRAM_HANDLE = "stonegallery001";
export const INSTAGRAM_URL = `https://www.instagram.com/${INSTAGRAM_HANDLE}`;

/** The person a customer is actually speaking to. */
export const CONCIERGE_NAME = "Esther";

/**
 * Builds a WhatsApp deep link with a prefilled message.
 * Pass the message unencoded; this encodes it.
 *
 * `number` defaults to the constant, which is what a surface rendering before
 * hydration wants. Pass the live value from `useSiteSettings()` anywhere an
 * admin change should take effect without a deploy.
 */
export function whatsappLink(message: string, number: string = WHATSAPP_NUMBER): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/**
 * The floor under `SettingsRepository.publicSettings()`.
 *
 * These constants are the first-paint and last-resort values: they render
 * during SSR before any query resolves, and they are what a missing or
 * malformed `site_settings` row falls back to. The database only ever
 * *overrides* them, so there is no empty-footer window and no layout shift
 * when the read is slow or fails.
 *
 * Instagram is not in here as a changeable value by accident — see the note on
 * `PublicSettings.instagram`. The footer and the JSON-LD `sameAs` both read
 * `INSTAGRAM_URL` directly so they can never disagree about the handle a
 * crawler is told to resolve.
 */
export const PUBLIC_SETTINGS_FALLBACK: PublicSettings = {
  contact: { email: CONTACT_EMAIL, phone: WHATSAPP_DISPLAY },
  whatsapp: WHATSAPP_NUMBER,
  instagram: INSTAGRAM_URL,
};
