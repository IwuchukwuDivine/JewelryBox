import type { PublicSettings, SettingsRepository } from "~/utils/types/api";
import { PUBLIC_SETTINGS_FALLBACK } from "~/utils/constants/contact";
import { getSupabase } from "~/utils/supabase";

/**
 * The public half of `site_settings`.
 *
 * Deliberately the only repository that swallows its own failures. Every other
 * one throws and lets a page render an error state, because a missing product is
 * information. A missing phone number is not: the footer, the contact page and
 * the order help card all want a value unconditionally, and a page that loses its
 * phone number because a row was emptied in admin is worse than one showing a
 * slightly stale one. So the compile-time constants are the floor and the
 * database only ever overrides them.
 *
 * The bank account is deliberately absent, and this module must never learn how
 * to read it: `site_settings.bank_account` has `is_public = false`, so RLS would
 * refuse anyway, and checkout gets it from `get_payment_instructions(order, email)`
 * where holding the order is what buys the account number.
 */

/** The keys this repository reads. Named explicitly rather than selecting every
 *  `is_public` row, so adding a public setting later cannot silently change what
 *  a page renders. */
const PUBLIC_KEYS = ["contact", "whatsapp", "instagram"] as const;

/** A usable string, or the floor. Mirrors `str()` in the mock repository. */
const str = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

/**
 * Digits only.
 *
 * `PublicSettings.whatsapp` declares E.164 with no `+` and no punctuation because
 * `wa.me/<number>` breaks on a space — and an admin typing a number into a form
 * writes it the way a human does, `+234 813 623 2942`. Normalising here enforces
 * the declared shape instead of trusting whoever filled the row; anything that
 * normalises to nothing falls back.
 */
const digits = (value: unknown, fallback: string): string => {
  const cleaned = typeof value === "string" ? value.replace(/\D/g, "") : "";
  return cleaned || fallback;
};

/**
 * `""` means "not published" and is honoured; missing or malformed falls back.
 *
 * The one field where empty is a value rather than a fault — a house may leave a
 * network, and it must be removable without a deploy. Malformed means "not an
 * http(s) URL": a bare `@handle` is replaced, because this feeds `sameAs` and a
 * crawler needs something it can resolve.
 */
const profileUrl = (value: unknown, fallback: string): string => {
  if (value === "") return "";
  const raw = typeof value === "string" ? value.trim() : "";
  return /^https?:\/\//i.test(raw) ? raw : fallback;
};

export const supabaseSettingsRepo: SettingsRepository = {
  async publicSettings(): Promise<PublicSettings> {
    const fallback = PUBLIC_SETTINGS_FALLBACK;

    // Absorbs the transport failure too, not only a malformed row. The contract
    // says this never throws, and "the request failed" is the likeliest way it
    // would — an unreachable database, an expired key, an offline client.
    // No initialiser: the catch returns, so a default here is dead.
    let rows: { key: string; value: unknown }[];
    try {
      const { data, error } = await getSupabase()
        .from("site_settings")
        .select("key, value")
        .in("key", PUBLIC_KEYS as unknown as string[]);
      if (error) throw error;
      rows = data ?? [];
    } catch {
      return structuredClone(fallback);
    }

    const byKey = new Map(rows.map((r) => [r.key, r.value]));
    const contact = byKey.get("contact");
    // jsonb gives us whatever was stored; an admin could have written a scalar.
    const contactObj =
      contact && typeof contact === "object" && !Array.isArray(contact)
        ? (contact as Record<string, unknown>)
        : {};

    return {
      contact: {
        email: str(contactObj.email, fallback.contact.email),
        phone: str(contactObj.phone, fallback.contact.phone),
      },
      whatsapp: digits(byKey.get("whatsapp"), fallback.whatsapp),
      instagram: profileUrl(byKey.get("instagram"), fallback.instagram),
    };
  },
};

export default supabaseSettingsRepo;
