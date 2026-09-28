/**
 * Transactional order email builders.
 *
 * Pure functions: an `Order` row in, ready-to-send payloads out. The notify
 * route re-reads the order from the database before calling in here, so every
 * figure in a rendered email comes from trusted data and never from the client.
 * `orderEmailKind()` is the one place that decides *which* email an order is
 * owed — the route derives the kind from the row rather than trusting a
 * client-sent event name.
 *
 * ── Email-client reality ─────────────────────────────────────────────────
 * Tables for layout, inline styles only, no `<style>` block, no flexbox, no
 * grid, no web fonts, ~560px of usable width. The font stacks stand in for
 * Marcellus / Instrument Sans / IBM Plex Mono with real system fallbacks.
 *
 * ── Palette ──────────────────────────────────────────────────────────────
 * Ivory, matching the site's light default: an obsidian email after an ivory
 * storefront reads as two brands. Colours come from `./emailPalette`, which
 * mirrors the `:root` light layer of `app/assets/css/main.css` as literal
 * hexes — email clients resolve no CSS custom properties. Every surface and
 * every colour is painted explicitly, so nothing depends on the client's own
 * theme handling; `color-scheme: light` is declared to stop a client
 * force-inverting the page, never relied on. Inline styles cannot carry a
 * `prefers-color-scheme` query, and a `<style>` block is out, so a single
 * committed palette is the robust choice rather than a compromise.
 *
 * The accent is `#9C7A4B` (champagne DEEP), not the `#C8A97E` of the dark
 * theme: at 3.5–4.0:1 on ivory it clears AA for large text only, so it carries
 * the two 24px hero figures and the panel borders and nothing smaller.
 *
 * ── The injection boundary ───────────────────────────────────────────────
 * Names, addresses, notes and product names are user input, and the vendor
 * copy of every email lands in an inbox the shop reads. `esc()` therefore
 * wraps EVERY interpolation on the HTML side. The plain-text side is plain by
 * construction and takes raw values.
 *
 * ── Links ────────────────────────────────────────────────────────────────
 * `siteUrl` is a required parameter, not a module constant. It comes from
 * `runtimeConfig.public.siteUrl` via `sendOrderEmails`, which is the value the
 * project treats as authoritative and the only one correct in every
 * environment. Reading `process.env` here instead would bake a build-time
 * value into the server bundle and make these builders impure.
 *
 * ── Money ────────────────────────────────────────────────────────────────
 * `formatPrice` / `formatDeliveryFee` are imported from the app rather than
 * re-implemented (BGI had a local `naira()` that could drift from the site).
 * `order.delivery_fee_ngn` may be `null`, meaning the destination is not
 * priced yet: every template that shows money branches on it and never
 * presents a total that looks final when part of it is unknown.
 */

import type { Order, OrderItem, OrderStatus } from "~~/app/utils/types/shop";
import { isPaid } from "~~/app/utils/constants/orderStatus";
import { formatDeliveryFee, formatPrice } from "~~/app/utils/formatPrice";
import { SITE_NAME, SITE_TAGLINE } from "~~/app/utils/constants/brand";
import {
  ACCENT,
  ACCENT_FILL,
  BORDER,
  ERROR,
  ON_ACCENT,
  SURFACE,
  SURFACE_ELEVATED,
  SURFACE_MUTED,
  TEXT_MUTED,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from "./emailPalette";

/* ── Public surface ───────────────────────────────────────────────────── */

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  /**
   * Plain-text alternative. Sent as `text` alongside `html`: it materially
   * helps deliverability (a multipart message reads less like bulk mail) and
   * it is what screen readers and text-only clients get.
   */
  text: string;
  /**
   * Stable across retries, unique per (order, kind, recipient). The sender
   * passes it as Resend's `Idempotency-Key`, so a double-clicked admin button
   * or a retried 5xx cannot send the same mail twice within 24 hours.
   */
  idempotencyKey: string;
  /** Vendor mail replies straight to the customer. Unset on customer mail. */
  replyTo?: string;
}

export type OrderEmailKind =
  | "received_transfer"
  | "received_on_delivery"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";

/**
 * The shop's account, as stored in `site_settings.bank_account` (private —
 * served order-scoped through `get_payment_instructions()`, never published).
 * snake_case to match the jsonb it comes from.
 */
export interface BankDetails {
  bank_name: string;
  account_number: string;
  account_name: string;
}

/**
 * The email an order's *current state* implies.
 *
 * Pure and total: every `OrderStatus` maps, and anything unrecognised falls
 * through to the placement mail for that payment lane rather than throwing.
 * A `confirmed` pay-on-delivery order is impossible (a CHECK constraint
 * forbids it) but is still handled — the `confirmed` template only mentions a
 * transfer when the order actually is one.
 */
export const orderEmailKind = (order: Order): OrderEmailKind => {
  switch (order.status) {
    case "confirmed":
      return "confirmed";
    case "shipped":
      return "shipped";
    case "delivered":
      return "delivered";
    case "cancelled":
      return "cancelled";
    case "received":
    default:
      return order.payment_method === "bank_transfer"
        ? "received_transfer"
        : "received_on_delivery";
  }
};

/* ── Tokens ───────────────────────────────────────────────────────────── */

/**
 * Absolute base for every link, supplied by the caller — `sendOrderEmails`
 * reads `runtimeConfig.public.siteUrl`, which is the authoritative value in
 * every environment. Deliberately NOT read from `process.env` here: that would
 * bake a build-time value into the server bundle, bypass the project's
 * "mirror every variable in runtimeConfig" convention, and make these builders
 * impure. It is a required parameter so a caller that forgets it is a compile
 * error rather than a silent link to production.
 */
const normaliseBase = (siteUrl: string): string => siteUrl.replace(/\/+$/, "");

/** Host only, for the footer's visible link text. */
const displayHost = (siteUrl: string): string =>
  normaliseBase(siteUrl).replace(/^https?:\/\//, "");

/** Stands in for Marcellus. */
const DISPLAY = "Georgia,'Times New Roman',Times,serif";
/** Stands in for Instrument Sans. */
const BODY =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
/** Stands in for IBM Plex Mono — order numbers, account numbers, figures. */
const MONO =
  "ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,'Liberation Mono',monospace";

/* ── Primitives ───────────────────────────────────────────────────────── */

/** The injection boundary. Every HTML interpolation goes through this. */
const esc = (value: unknown): string =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const firstName = (order: Order): string =>
  order.shipping_address.full_name.trim().split(/\s+/)[0] || "there";

/** `24 September 2026`, in Lagos time. Empty string for anything unparseable. */
const dateLabel = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Lagos",
  });
};

/** True when the destination has no active rate yet — the fee follows by mail. */
const isUnpriced = (order: Order): boolean => order.delivery_fee_ngn === null;

/**
 * What the customer actually owes, or `null` when it cannot be stated because
 * the delivery fee is unknown. Never falls back to the subtotal: `total_ngn`
 * is generated as `subtotal + coalesce(fee, 0)`, so printing it on an unpriced
 * order would quote a total that is missing a line.
 */
const amountPayable = (order: Order): number | null =>
  isUnpriced(order) ? null : order.total_ngn;

/**
 * `To be confirmed` for an unpriced destination, `Free` at zero, else the fee.
 *
 * The null wording is passed in rather than owned by the formatter because the
 * right phrase depends on tense: checkout says "Quoted after you order", which
 * is wrong in a mail the customer has already acted on. `formatDeliveryFee`'s
 * overloads demand the phrase exactly where null is reachable, so the ₦ and
 * "Free" logic stays in one place without either side inventing a vocabulary.
 */
const feeLabel = (order: Order): string =>
  formatDeliveryFee(order.delivery_fee_ngn, "To be confirmed");

/** How the piece travels, in a sentence. */
const carriage = (order: Order): string =>
  order.delivery_method === "dispatch"
    ? "by dispatch rider"
    : "by air freight";

/**
 * Whether money has actually reached the shop for this order.
 *
 * DO NOT simplify this to `isPaid(order.status, order.payment_method)`. That is
 * the tempting reduction and it is wrong here, because `isPaid()` reads the
 * *current* status — and the one order that most needs this question answered
 * is a cancelled one, whose current status is `cancelled` and therefore never
 * paid under either lane. A bank transfer cancelled after `confirmed` took real
 * money; collapsing this to the current status would silently stop the
 * cancellation email promising the refund that is owed.
 *
 * So all three signals are consulted: the current status (the normal case),
 * `paid_at` (set at `confirmed` for transfers and at `delivered` for
 * pay-on-delivery, and never cleared), and `isPaid()` over the whole
 * `status_history` (the order passed through a paid state even if it has since
 * left it). Any one of them means money changed hands.
 */
const moneyReceived = (order: Order): boolean =>
  isPaid(order.status, order.payment_method) ||
  order.paid_at !== null ||
  order.status_history.some((event) =>
    isPaid(event.status, order.payment_method),
  );

/**
 * The most recent history entry for a status. A manual reverse scan rather
 * than `findLast()`, which is ES2023 and not guaranteed by the project's lib.
 */
const lastEventFor = (order: Order, status: OrderStatus) => {
  for (let i = order.status_history.length - 1; i >= 0; i--) {
    const event = order.status_history[i];
    if (event && event.status === status) return event;
  }
  return undefined;
};

/** The note an admin attached when the order reached its current status. */
const latestNote = (order: Order): string | undefined =>
  lastEventFor(order, order.status)?.note;

const trackUrl = (order: Order, siteUrl: string): string =>
  `${siteUrl}/track?ref=${encodeURIComponent(order.order_number)}`;

const adminUrl = (siteUrl: string): string => `${siteUrl}/admin/orders`;

/* ── HTML building blocks ─────────────────────────────────────────────── */

const MICRO = `font-family:${BODY};font-size:10px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:${TEXT_MUTED};`;
const LEDE = `margin:0 0 20px;font-family:${BODY};font-size:15px;line-height:1.65;color:${TEXT_SECONDARY};`;
const NOTE = `margin:0 0 20px;font-family:${BODY};font-size:13px;line-height:1.65;color:${TEXT_MUTED};`;
const STRONG = `color:${TEXT_PRIMARY};font-weight:600;`;

const h1 = (text: string): string =>
  `<h1 style="margin:0 0 16px;font-family:${DISPLAY};font-size:26px;line-height:1.25;font-weight:400;letter-spacing:-0.01em;color:${TEXT_PRIMARY};">${esc(text)}</h1>`;

/** Body copy. `html` is already-escaped markup, not raw input. */
const p = (html: string, style = LEDE): string =>
  `<p style="${style}">${html}</p>`;

const microLabel = (text: string): string =>
  `<p style="margin:0 0 8px;${MICRO}">${esc(text)}</p>`;

/** A hairline-bordered panel. `inner` is already-escaped markup. */
const panel = (inner: string, accent = false): string => `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;border-collapse:separate;">
        <tr>
          <td style="padding:20px 22px;background-color:${SURFACE_MUTED};border:1px solid ${accent ? ACCENT : BORDER};border-radius:2px;">${inner}</td>
        </tr>
      </table>`;

/** The transfer reference, impossible to miss and set in mono. */
const referencePanel = (order: Order): string =>
  panel(
    `${microLabel("Transfer reference")}
            <p style="margin:0;font-family:${MONO};font-size:24px;line-height:1.2;font-weight:500;letter-spacing:0.1em;color:${ACCENT};">${esc(order.order_number)}</p>
            <p style="margin:10px 0 0;font-family:${BODY};font-size:12.5px;line-height:1.6;color:${TEXT_MUTED};">Use this exactly as the narration on your transfer. It is how we match your payment to your piece.</p>`,
    true,
  );

const bankPanel = (order: Order, bank: BankDetails): string => {
  const row = (label: string, value: string, mono = false): string => `
            <tr>
              <td style="padding:5px 0;font-family:${BODY};font-size:12.5px;color:${TEXT_MUTED};white-space:nowrap;">${esc(label)}</td>
              <td align="right" style="padding:5px 0 5px 12px;font-family:${mono ? MONO : BODY};font-size:14px;font-weight:600;color:${TEXT_PRIMARY};">${esc(value)}</td>
            </tr>`;
  const payable = amountPayable(order);
  return panel(
    `${microLabel("Transfer to")}
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
              ${row("Bank", bank.bank_name)}
              ${row("Account number", bank.account_number, true)}
              ${row("Account name", bank.account_name)}
              ${row(
                payable === null ? "Amount (items)" : "Amount",
                payable === null
                  ? formatPrice(order.subtotal_ngn)
                  : formatPrice(payable),
                true,
              )}
            </table>${
              payable === null
                ? `
            <p style="margin:12px 0 0;font-family:${BODY};font-size:12.5px;line-height:1.6;color:${TEXT_MUTED};">Delivery to ${esc(order.delivery_destination)} is not priced yet. Transfer the item amount above; we will write with the delivery fee before your piece travels.</p>`
                : ""
            }`,
  );
};

/** One amount, given its own panel — the figure the reader is looking for. */
const figurePanel = (
  label: string,
  figure: string,
  footnote?: string,
): string =>
  panel(
    `${microLabel(label)}
            <p style="margin:0;font-family:${MONO};font-size:24px;line-height:1.2;font-weight:500;letter-spacing:0.02em;color:${ACCENT};">${esc(figure)}</p>${
              footnote
                ? `
            <p style="margin:10px 0 0;font-family:${BODY};font-size:12.5px;line-height:1.6;color:${TEXT_MUTED};">${esc(footnote)}</p>`
                : ""
            }`,
    true,
  );

const itemLine = (item: OrderItem): string => {
  const unit = `${item.quantity} × ${formatPrice(item.price_ngn)}`;
  return `
          <tr>
            <td style="padding:12px 0;border-bottom:1px solid ${BORDER};font-family:${BODY};font-size:14px;line-height:1.5;color:${TEXT_PRIMARY};">
              <span style="display:block;${MICRO}margin-bottom:3px;">${esc(item.brand)}</span>
              ${esc(item.name)}${item.variant_label ? `<span style="color:${TEXT_SECONDARY};"> · ${esc(item.variant_label)}</span>` : ""}
              <span style="display:block;margin-top:3px;font-family:${MONO};font-size:11.5px;color:${TEXT_MUTED};">${esc(unit)}</span>
            </td>
            <td align="right" valign="top" style="padding:12px 0 12px 12px;border-bottom:1px solid ${BORDER};font-family:${MONO};font-size:14px;color:${TEXT_PRIMARY};white-space:nowrap;">${esc(formatPrice(item.price_ngn * item.quantity))}</td>
          </tr>`;
};

/**
 * Genuinely tabular data, so this is a real table with column headers rather
 * than a presentational one — screen readers announce the pairing instead of
 * a stream of unlabelled cells.
 */
const itemsTable = (order: Order): string => `
      <table width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 4px;border-collapse:collapse;">
        <tr>
          <th scope="col" align="left" style="padding:0 0 10px;border-bottom:1px solid ${BORDER};${MICRO}">Piece</th>
          <th scope="col" align="right" style="padding:0 0 10px 12px;border-bottom:1px solid ${BORDER};${MICRO}">Amount</th>
        </tr>${order.items.map(itemLine).join("")}
      </table>`;

type Audience = "customer" | "vendor";

const totalsTable = (order: Order, audience: Audience = "customer"): string => {
  const row = (label: string, value: string, emphasis = false): string => `
          <tr>
            <td style="padding:${emphasis ? "12px 0 0" : "8px 0 0"};font-family:${BODY};font-size:${emphasis ? "13px" : "12.5px"};${emphasis ? MICRO : `color:${TEXT_MUTED};`}">${esc(label)}</td>
            <td align="right" style="padding:${emphasis ? "12px 0 0 12px" : "8px 0 0 12px"};font-family:${MONO};font-size:${emphasis ? "17px" : "13px"};font-weight:${emphasis ? "500" : "400"};color:${emphasis ? TEXT_PRIMARY : TEXT_SECONDARY};white-space:nowrap;">${esc(value)}</td>
          </tr>`;
  return `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;border-collapse:collapse;">
        ${row("Subtotal", formatPrice(order.subtotal_ngn))}
        ${row(`Delivery · ${order.delivery_destination}`, feeLabel(order))}
        ${
          isUnpriced(order)
            ? `<tr>
            <td colspan="2" style="padding:12px 0 0;border-top:1px solid ${BORDER};font-family:${BODY};font-size:12.5px;line-height:1.6;color:${TEXT_MUTED};">${
              audience === "vendor"
                ? `No total yet — ${esc(order.delivery_destination)} is unpriced, so this order carries the items only.`
                : `Your total is confirmed once delivery to ${esc(order.delivery_destination)} is priced. We will write to you with it.`
            }</td>
          </tr>`
            : row("Total", formatPrice(order.total_ngn), true)
        }
      </table>`;
};

const orderSummaryTable = (order: Order, audience: Audience = "customer"): string =>
  `${itemsTable(order)}${totalsTable(order, audience)}`;

const addressBlock = (order: Order): string => {
  const a = order.shipping_address;
  const lines = [
    a.full_name,
    a.line1,
    a.line2,
    [a.city, a.state].filter(Boolean).join(", "),
    a.state === "Lagos" && a.area ? a.area : undefined,
    a.phone,
  ]
    .filter((line): line is string => Boolean(line && line.trim()))
    .map((line) => esc(line))
    .join("<br />");
  return `${microLabel("Delivering to")}
      <p style="margin:0 0 24px;font-family:${BODY};font-size:13.5px;line-height:1.7;color:${TEXT_SECONDARY};">${lines}</p>`;
};

/**
 * The customer's own note, quoted back. Raw user input — escaped. The label
 * changes with the audience: the customer reads "Your note", the vendor reads
 * whose note it is.
 */
const customerNoteBlock = (
  order: Order,
  audience: Audience = "customer",
): string => {
  const notes = order.shipping_address.notes?.trim();
  if (!notes) return "";
  return `${microLabel(audience === "vendor" ? "Note from the customer" : "Your note")}
      <p style="margin:0 0 24px;font-family:${BODY};font-size:13.5px;line-height:1.7;color:${TEXT_SECONDARY};">${esc(notes)}</p>`;
};

/** Table-wrapped so Outlook's Word engine still renders the padding. */
const button = (href: string, label: string): string => `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;border-collapse:separate;">
        <tr>
          <td align="center" bgcolor="${ACCENT_FILL}" style="border-radius:2px;">
            <a href="${esc(href)}" style="display:inline-block;padding:14px 26px;font-family:${BODY};font-size:11.5px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${ON_ACCENT};text-decoration:none;">${esc(label)}</a>
          </td>
        </tr>
      </table>`;

const replyLine = (): string =>
  p(
    `Reply to this email if you need anything — it reaches us directly.`,
    NOTE,
  );

/**
 * The wrapper. `title` doubles as what assistive tech reads first, `preheader`
 * is the snippet the inbox shows after the subject, and `body` is
 * already-escaped markup.
 */
const shell = (
  title: string,
  preheader: string,
  body: string,
  siteUrl: string,
): string => `<!doctype html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="x-ua-compatible" content="ie=edge" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;width:100%;background-color:${SURFACE};color:${TEXT_PRIMARY};-webkit-text-size-adjust:100%;">
<div lang="en" dir="ltr" style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${SURFACE};mso-hide:all;">${esc(preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${SURFACE};">
  <tr>
    <td align="center" style="padding:32px 12px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;width:100%;background-color:${SURFACE_ELEVATED};border:1px solid ${BORDER};border-radius:3px;">
        <tr>
          <td style="padding:22px 32px;border-bottom:1px solid ${BORDER};">
            <a href="${esc(siteUrl)}" style="font-family:${DISPLAY};font-size:15px;font-weight:400;letter-spacing:0.26em;color:${TEXT_PRIMARY};text-decoration:none;">${esc(SITE_NAME.toUpperCase())}</a>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">${body}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid ${BORDER};font-family:${BODY};font-size:11.5px;line-height:1.7;color:${TEXT_MUTED};">
            ${esc(SITE_NAME)} · ${esc(SITE_TAGLINE)}<br />
            Lagos, Nigeria · <a href="${esc(siteUrl)}" style="color:${TEXT_SECONDARY};text-decoration:underline;">${esc(displayHost(siteUrl))}</a><br />
            You are receiving this because an order was placed with ${esc(SITE_NAME)}.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

/* ── Plain-text building blocks ───────────────────────────────────────── */
/* Plain by construction: raw values, never escaped. */

const RULE = "—".repeat(46);

const itemLinesText = (order: Order): string[] => [
  "PIECES",
  ...order.items.map(
    (item) =>
      `  ${item.brand} · ${item.name}${item.variant_label ? ` · ${item.variant_label}` : ""}\n` +
      `    ${item.quantity} × ${formatPrice(item.price_ngn)} = ${formatPrice(item.price_ngn * item.quantity)}`,
  ),
];

const totalsLinesText = (
  order: Order,
  audience: Audience = "customer",
): string[] => [
  `Subtotal: ${formatPrice(order.subtotal_ngn)}`,
  `Delivery · ${order.delivery_destination}: ${feeLabel(order)}`,
  ...(isUnpriced(order)
    ? [
        audience === "vendor"
          ? `No total yet — ${order.delivery_destination} is unpriced, so this order carries the items only.`
          : `Your total is confirmed once delivery to ${order.delivery_destination} is priced. We will write to you with it.`,
      ]
    : [`Total: ${formatPrice(order.total_ngn)}`]),
];

const addressLinesText = (order: Order): string[] => {
  const a = order.shipping_address;
  return [
    "DELIVERING TO",
    ...[
      a.full_name,
      a.line1,
      a.line2,
      [a.city, a.state].filter(Boolean).join(", "),
      a.state === "Lagos" && a.area ? a.area : undefined,
      a.phone,
    ]
      .filter((line): line is string => Boolean(line && line.trim()))
      .map((line) => `  ${line}`),
  ];
};

const summaryLinesText = (
  order: Order,
  audience: Audience = "customer",
): string[] => [...itemLinesText(order), "", ...totalsLinesText(order, audience)];

/** Joins sections into a text body, collapsing runs of blank lines. */
const textShell = (
  title: string,
  lines: (string | undefined)[],
  siteUrl: string,
): string =>
  [
    SITE_NAME.toUpperCase(),
    RULE,
    "",
    title,
    "",
    ...lines.filter((line): line is string => line !== undefined),
    "",
    RULE,
    `${SITE_NAME} · ${SITE_TAGLINE}`,
    `Lagos, Nigeria · ${siteUrl}`,
  ]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();

/* ── Idempotency ──────────────────────────────────────────────────────── */

/**
 * `<kind>/<order-number>/<role>` — under Resend's 256-character cap, stable
 * across retries, and distinct per recipient so the customer mail succeeding
 * never suppresses the vendor's.
 */
const idempotencyKey = (
  order: Order,
  kind: OrderEmailKind,
  role: "customer" | "vendor",
): string => `${kind}/${order.order_number}/${role}`;

/* ── Customer templates ───────────────────────────────────────────────── */

const receivedTransferCustomer = (
  order: Order,
  bank: BankDetails,
  siteUrl: string,
): EmailPayload => {
  const payable = amountPayable(order);
  const body = `
            ${h1("Order received.")}
            ${p(`Thank you, <span style="${STRONG}">${esc(firstName(order))}</span>. Your order is with us and held while we wait for your transfer.`)}
            ${referencePanel(order)}
            ${bankPanel(order, bank)}
            ${p(`Your piece is reserved for you the moment we see the transfer, and we will write to confirm it. Until then it stays available to others, so do send the transfer when you can.`)}
            ${orderSummaryTable(order)}
            ${button(trackUrl(order, siteUrl), `Track order ${order.order_number}`)}
            ${addressBlock(order)}
            ${customerNoteBlock(order)}
            ${replyLine()}`;
  return {
    to: order.shipping_address.email,
    subject: `Order ${order.order_number} received — complete your transfer`,
    html: shell(
      `Order ${order.order_number} received`,
      `Transfer reference ${order.order_number}. Your piece is reserved once the transfer is seen.`,
      body,
      siteUrl,
    ),
    text: textShell("ORDER RECEIVED", [
      `Thank you, ${firstName(order)}. Your order is with us and held while we wait for your transfer.`,
      "",
      `TRANSFER REFERENCE: ${order.order_number}`,
      "Use this exactly as the narration on your transfer.",
      "",
      "TRANSFER TO",
      `  Bank: ${bank.bank_name}`,
      `  Account number: ${bank.account_number}`,
      `  Account name: ${bank.account_name}`,
      payable === null
        ? `  Amount (items): ${formatPrice(order.subtotal_ngn)}`
        : `  Amount: ${formatPrice(payable)}`,
      payable === null
        ? `  Delivery to ${order.delivery_destination} is not priced yet. Transfer the item amount above; we will write with the delivery fee before your piece travels.`
        : undefined,
      "",
      "Your piece is reserved for you the moment we see the transfer, and we will write to confirm it.",
      "",
      ...summaryLinesText(order),
      "",
      `Track your order: ${trackUrl(order, siteUrl)}`,
      "",
      ...addressLinesText(order),
      "",
      "Reply to this email if you need anything — it reaches us directly.",
    ], siteUrl),
    idempotencyKey: idempotencyKey(order, "received_transfer", "customer"),
  };
};

const receivedOnDeliveryCustomer = (order: Order, siteUrl: string): EmailPayload => {
  const payable = amountPayable(order);
  const dueFigure =
    payable === null
      ? figurePanel(
          "Due on delivery",
          `${formatPrice(order.subtotal_ngn)} + delivery`,
          `Delivery to ${order.delivery_destination} is not priced yet, so the amount due at the door is not final. We will write with the delivery fee and the exact amount before your piece travels.`,
        )
      : figurePanel(
          "Due on delivery",
          formatPrice(payable),
          "Payable in cash or by transfer when your piece reaches you.",
        );
  const body = `
            ${h1("Order received.")}
            ${p(`Thank you, <span style="${STRONG}">${esc(firstName(order))}</span>. Your order is with us. Nothing is due now — payment is collected when your piece reaches you.`)}
            ${dueFigure}
            ${p(
              payable === null
                ? `Please have the item amount ready, and we will confirm the delivery fee for ${esc(order.delivery_destination)} separately so nothing is a surprise at the door.`
                : `Please have ${esc(formatPrice(payable))} ready for the rider or courier. Cash or a transfer on the spot, whichever suits you.`,
            )}
            ${orderSummaryTable(order)}
            ${button(trackUrl(order, siteUrl), `Track order ${order.order_number}`)}
            ${addressBlock(order)}
            ${customerNoteBlock(order)}
            ${p(`Your reference is <span style="font-family:${MONO};${STRONG}">${esc(order.order_number)}</span>. Quote it if you write to us about this order.`, NOTE)}
            ${replyLine()}`;
  return {
    to: order.shipping_address.email,
    subject:
      payable === null
        ? `Order ${order.order_number} received — amount due to follow`
        : `Order ${order.order_number} received — ${formatPrice(payable)} due on delivery`,
    html: shell(
      `Order ${order.order_number} received`,
      payable === null
        ? `Payment on delivery. We will confirm the delivery fee for ${order.delivery_destination} shortly.`
        : `${formatPrice(payable)} due on delivery, in cash or by transfer.`,
      body,
      siteUrl,
    ),
    text: textShell("ORDER RECEIVED", [
      `Thank you, ${firstName(order)}. Your order is with us. Nothing is due now — payment is collected when your piece reaches you.`,
      "",
      payable === null
        ? `DUE ON DELIVERY: ${formatPrice(order.subtotal_ngn)} + delivery`
        : `DUE ON DELIVERY: ${formatPrice(payable)}`,
      payable === null
        ? `Delivery to ${order.delivery_destination} is not priced yet, so the amount due at the door is not final. We will write with the delivery fee and the exact amount before your piece travels.`
        : "Payable in cash or by transfer when your piece reaches you.",
      "",
      ...summaryLinesText(order),
      "",
      `Track your order: ${trackUrl(order, siteUrl)}`,
      "",
      ...addressLinesText(order),
      "",
      `Your reference is ${order.order_number}. Quote it if you write to us about this order.`,
      "Reply to this email if you need anything — it reaches us directly.",
    ], siteUrl),
    idempotencyKey: idempotencyKey(order, "received_on_delivery", "customer"),
  };
};

const confirmedCustomer = (order: Order, siteUrl: string): EmailPayload => {
  const transfer = order.payment_method === "bank_transfer";
  const opening = transfer
    ? `Your transfer for <span style="font-family:${MONO};${STRONG}">${esc(order.order_number)}</span> has landed. Thank you.`
    : `Payment for <span style="font-family:${MONO};${STRONG}">${esc(order.order_number)}</span> has been confirmed. Thank you.`;
  const body = `
            ${h1("Payment confirmed.")}
            ${p(`${esc(firstName(order))}, ${opening}`)}
            ${p(`Your piece is now being prepared and sealed for the journey to ${esc(order.delivery_destination)} ${esc(carriage(order))}. We will write again the moment it leaves us.`)}
            ${
              isUnpriced(order)
                ? p(
                    `One thing outstanding: delivery to ${esc(order.delivery_destination)} is not priced yet. We will send the fee separately, before your piece travels.`,
                    NOTE,
                  )
                : ""
            }
            ${orderSummaryTable(order)}
            ${button(trackUrl(order, siteUrl), `Track order ${order.order_number}`)}
            ${addressBlock(order)}
            ${replyLine()}`;
  return {
    to: order.shipping_address.email,
    subject: `Payment confirmed — order ${order.order_number}`,
    html: shell(
      `Payment confirmed — order ${order.order_number}`,
      `Your piece is being prepared for ${order.delivery_destination}.`,
      body,
      siteUrl,
    ),
    text: textShell("PAYMENT CONFIRMED", [
      `${firstName(order)}, ${transfer ? `your transfer for ${order.order_number} has landed.` : `payment for ${order.order_number} has been confirmed.`} Thank you.`,
      "",
      `Your piece is now being prepared and sealed for the journey to ${order.delivery_destination} ${carriage(order)}. We will write again the moment it leaves us.`,
      isUnpriced(order)
        ? `\nDelivery to ${order.delivery_destination} is not priced yet. We will send the fee separately, before your piece travels.`
        : undefined,
      "",
      ...summaryLinesText(order),
      "",
      `Track your order: ${trackUrl(order, siteUrl)}`,
      "",
      ...addressLinesText(order),
      "",
      "Reply to this email if you need anything — it reaches us directly.",
    ], siteUrl),
    idempotencyKey: idempotencyKey(order, "confirmed", "customer"),
  };
};

const shippedCustomer = (order: Order, siteUrl: string): EmailPayload => {
  const dispatch = order.delivery_method === "dispatch";
  const payable = amountPayable(order);
  const collectOnDelivery = order.payment_method === "pay_on_delivery";

  const journey = dispatch
    ? `A dispatch rider is carrying your order to ${esc(order.delivery_destination)}. Lagos runs arrive the same day or the next working day, so please make sure someone is available to receive it on <span style="${STRONG}">${esc(order.shipping_address.phone)}</span>.`
    : `Your order has gone by air freight to ${esc(order.delivery_destination)}. Air freight takes one to three working days. We will be in touch on <span style="${STRONG}">${esc(order.shipping_address.phone)}</span> with the handover details.`;

  const payNote = collectOnDelivery
    ? payable === null
      ? p(
          `Payment is collected on delivery. Delivery to ${esc(order.delivery_destination)} is still being priced, so please have ${esc(formatPrice(order.subtotal_ngn))} plus the delivery fee ready — we will confirm the exact amount before handover.`,
          NOTE,
        )
      : p(
          `Payment is collected on delivery. Please have <span style="font-family:${MONO};${STRONG}">${esc(formatPrice(payable))}</span> ready, in cash or by transfer.`,
          NOTE,
        )
    : "";

  const note = latestNote(order)?.trim();

  const body = `
            ${h1("Your piece is on its way.")}
            ${p(`${esc(firstName(order))}, order <span style="font-family:${MONO};${STRONG}">${esc(order.order_number)}</span> has left us.`)}
            ${p(journey)}
            ${note ? p(`From the packing note: “${esc(note)}”`, NOTE) : ""}
            ${payNote}
            ${orderSummaryTable(order)}
            ${button(trackUrl(order, siteUrl), `Track order ${order.order_number}`)}
            ${addressBlock(order)}
            ${replyLine()}`;
  return {
    to: order.shipping_address.email,
    subject: `Order ${order.order_number} is on its way`,
    html: shell(
      `Order ${order.order_number} is on its way`,
      dispatch
        ? `A rider is carrying your order to ${order.delivery_destination}.`
        : `On air freight to ${order.delivery_destination}, one to three working days.`,
      body,
      siteUrl,
    ),
    text: textShell("YOUR PIECE IS ON ITS WAY", [
      `${firstName(order)}, order ${order.order_number} has left us.`,
      "",
      dispatch
        ? `A dispatch rider is carrying your order to ${order.delivery_destination}. Lagos runs arrive the same day or the next working day, so please make sure someone is available to receive it on ${order.shipping_address.phone}.`
        : `Your order has gone by air freight to ${order.delivery_destination}. Air freight takes one to three working days. We will be in touch on ${order.shipping_address.phone} with the handover details.`,
      note ? `\nFrom the packing note: "${note}"` : undefined,
      collectOnDelivery
        ? payable === null
          ? `\nPayment is collected on delivery. Delivery to ${order.delivery_destination} is still being priced, so please have ${formatPrice(order.subtotal_ngn)} plus the delivery fee ready — we will confirm the exact amount before handover.`
          : `\nPayment is collected on delivery. Please have ${formatPrice(payable)} ready, in cash or by transfer.`
        : undefined,
      "",
      ...summaryLinesText(order),
      "",
      `Track your order: ${trackUrl(order, siteUrl)}`,
      "",
      ...addressLinesText(order),
      "",
      "Reply to this email if you need anything — it reaches us directly.",
    ], siteUrl),
    idempotencyKey: idempotencyKey(order, "shipped", "customer"),
  };
};

const deliveredCustomer = (order: Order, siteUrl: string): EmailPayload => {
  const when = dateLabel(
    lastEventFor(order, "delivered")?.at ?? order.paid_at,
  );
  const collected = order.payment_method === "pay_on_delivery";
  const payable = amountPayable(order);
  const receipt =
    collected && moneyReceived(order)
      ? payable === null
        ? p(
            `Payment was collected on delivery. Delivery to ${esc(order.delivery_destination)} was priced separately, so the amount collected includes that fee.`,
            NOTE,
          )
        : p(
            `Payment of <span style="font-family:${MONO};${STRONG}">${esc(formatPrice(payable))}</span> was collected on delivery. This note is your receipt.`,
            NOTE,
          )
      : "";
  const body = `
            ${h1("Delivered.")}
            ${p(`${esc(firstName(order))}, order <span style="font-family:${MONO};${STRONG}">${esc(order.order_number)}</span> reached ${esc(order.shipping_address.city)}${when ? ` on ${esc(when)}` : ""}. We hope it is everything you wanted.`)}
            ${receipt}
            ${orderSummaryTable(order)}
            ${p(`If anything is not as it should be — the piece, the packaging, the paperwork — reply to this email and we will put it right.`)}
            ${p(`Thank you for choosing ${esc(SITE_NAME)}.`, NOTE)}`;
  return {
    to: order.shipping_address.email,
    subject: collected
      ? `Order ${order.order_number} delivered — your receipt`
      : `Order ${order.order_number} delivered`,
    html: shell(
      `Order ${order.order_number} delivered`,
      collected
        ? `Delivered and paid. Your receipt is inside.`
        : `Delivered. Tell us if anything is not as it should be.`,
      body,
      siteUrl,
    ),
    text: textShell("DELIVERED", [
      `${firstName(order)}, order ${order.order_number} reached ${order.shipping_address.city}${when ? ` on ${when}` : ""}. We hope it is everything you wanted.`,
      collected && moneyReceived(order)
        ? payable === null
          ? `\nPayment was collected on delivery. Delivery to ${order.delivery_destination} was priced separately, so the amount collected includes that fee.`
          : `\nPayment of ${formatPrice(payable)} was collected on delivery. This note is your receipt.`
        : undefined,
      "",
      ...summaryLinesText(order),
      "",
      "If anything is not as it should be — the piece, the packaging, the paperwork — reply to this email and we will put it right.",
      "",
      `Thank you for choosing ${SITE_NAME}.`,
    ], siteUrl),
    idempotencyKey: idempotencyKey(order, "delivered", "customer"),
  };
};

const cancelledCustomer = (order: Order, siteUrl: string): EmailPayload => {
  const refunded = moneyReceived(order);
  const payable = amountPayable(order);
  const note = latestNote(order)?.trim();
  const refundHtml = refunded
    ? p(
        payable === null
          ? `A payment was received against this order, and it is being refunded in full to the account it came from. Allow up to five working days for it to appear.`
          : `The <span style="font-family:${MONO};${STRONG}">${esc(formatPrice(payable))}</span> received against this order is being refunded in full to the account it came from. Allow up to five working days for it to appear.`,
      )
    : p(
        `Our records show no payment against this order. If you have already transferred using reference <span style="font-family:${MONO};${STRONG}">${esc(order.order_number)}</span>, reply to this email and we will return it in full.`,
      );
  const body = `
            ${h1("Order cancelled.")}
            ${p(`${esc(firstName(order))}, order <span style="font-family:${MONO};${STRONG}">${esc(order.order_number)}</span> has been cancelled.`)}
            ${note ? p(`Reason recorded: “${esc(note)}”`, NOTE) : ""}
            ${refundHtml}
            ${orderSummaryTable(order)}
            ${p(`The pieces above are back in the collection. If you would still like them, or you cancelled by mistake, reply to this email and we will set it up again.`, NOTE)}`;
  return {
    to: order.shipping_address.email,
    subject: `Order ${order.order_number} cancelled`,
    html: shell(
      `Order ${order.order_number} cancelled`,
      refunded
        ? `Cancelled. A full refund is on its way.`
        : `Cancelled. Nothing was taken.`,
      body,
      siteUrl,
    ),
    text: textShell("ORDER CANCELLED", [
      `${firstName(order)}, order ${order.order_number} has been cancelled.`,
      note ? `\nReason recorded: "${note}"` : undefined,
      "",
      refunded
        ? payable === null
          ? "A payment was received against this order, and it is being refunded in full to the account it came from. Allow up to five working days for it to appear."
          : `The ${formatPrice(payable)} received against this order is being refunded in full to the account it came from. Allow up to five working days for it to appear.`
        : `Our records show no payment against this order. If you have already transferred using reference ${order.order_number}, reply to this email and we will return it in full.`,
      "",
      ...summaryLinesText(order),
      "",
      "The pieces above are back in the collection. If you would still like them, or you cancelled by mistake, reply to this email and we will set it up again.",
    ], siteUrl),
    idempotencyKey: idempotencyKey(order, "cancelled", "customer"),
  };
};

/* ── Vendor templates ─────────────────────────────────────────────────── */

const contactLine = (order: Order): string => {
  const a = order.shipping_address;
  return `<span style="${STRONG}">${esc(a.full_name)}</span><br /><a href="mailto:${esc(a.email)}" style="color:${TEXT_PRIMARY};text-decoration:underline;">${esc(a.email)}</a> · <a href="tel:${esc(a.phone)}" style="color:${TEXT_PRIMARY};text-decoration:underline;">${esc(a.phone)}</a>`;
};

const deliveryFactsHtml = (order: Order): string => {
  const method =
    order.delivery_method === "dispatch" ? "Dispatch" : "Air freight";
  return `${microLabel("Delivery")}
      <p style="margin:0 0 24px;font-family:${BODY};font-size:13.5px;line-height:1.7;color:${TEXT_SECONDARY};">
        ${esc(method)} · ${esc(order.delivery_destination)} · ${esc(feeLabel(order))}${
          isUnpriced(order)
            ? `<br /><span style="color:${ERROR};font-weight:600;">Not priced — set the fee for ${esc(order.delivery_destination)} before this ships.</span>`
            : ""
        }
      </p>`;
};

const deliveryFactsText = (order: Order): string[] => [
  "DELIVERY",
  `  ${order.delivery_method === "dispatch" ? "Dispatch" : "Air freight"} · ${order.delivery_destination} · ${feeLabel(order)}`,
  ...(isUnpriced(order)
    ? [
        `  NOT PRICED — set the fee for ${order.delivery_destination} before this ships.`,
      ]
    : []),
];

/** Every vendor mail shares this frame — facts first, then the admin link. */
const vendorEmailFrom = (
  order: Order,
  kind: OrderEmailKind,
  vendorEmail: string,
  siteUrl: string,
  opts: {
    subject: string;
    preheader: string;
    heading: string;
    ledeHtml: string;
    ledeText: string;
    extraHtml?: string;
    extraText?: string[];
    withSummary?: boolean;
  },
): EmailPayload => {
  const a = order.shipping_address;
  const withSummary = opts.withSummary !== false;
  const body = `
            ${h1(opts.heading)}
            ${p(opts.ledeHtml)}
            ${opts.extraHtml ?? ""}
            ${microLabel("Reference")}
            <p style="margin:0 0 24px;font-family:${MONO};font-size:15px;font-weight:500;letter-spacing:0.1em;color:${TEXT_PRIMARY};">${esc(order.order_number)}</p>
            ${withSummary ? orderSummaryTable(order, "vendor") : ""}
            ${deliveryFactsHtml(order)}
            ${addressBlock(order)}
            ${customerNoteBlock(order, "vendor")}
            ${microLabel("Customer")}
            ${p(contactLine(order), `margin:0 0 24px;font-family:${BODY};font-size:13.5px;line-height:1.7;color:${TEXT_SECONDARY};`)}
            ${button(adminUrl(siteUrl), "Open admin orders")}`;
  return {
    to: vendorEmail,
    subject: opts.subject,
    html: shell(opts.subject, opts.preheader, body, siteUrl),
    text: textShell(opts.heading.toUpperCase(), [
      opts.ledeText,
      ...(opts.extraText ?? []),
      "",
      `REFERENCE: ${order.order_number}`,
      "",
      ...(withSummary ? summaryLinesText(order, "vendor") : []),
      "",
      ...deliveryFactsText(order),
      "",
      ...addressLinesText(order),
      ...(a.notes?.trim()
        ? ["", "NOTE FROM THE CUSTOMER", `  ${a.notes.trim()}`]
        : []),
      "",
      "CUSTOMER",
      `  ${a.full_name} · ${a.email} · ${a.phone}`,
      "",
      `Admin orders: ${adminUrl(siteUrl)}`,
    ], siteUrl),
    idempotencyKey: idempotencyKey(order, kind, "vendor"),
    replyTo: a.email,
  };
};

const receivedTransferVendor = (
  order: Order,
  vendorEmail: string,
  siteUrl: string,
): EmailPayload => {
  const payable = amountPayable(order);
  return vendorEmailFrom(order, "received_transfer", vendorEmail, siteUrl, {
    subject: `New order ${order.order_number} — ${payable === null ? `${formatPrice(order.subtotal_ngn)} + delivery` : formatPrice(payable)} by transfer`,
    preheader: `${order.shipping_address.full_name} · awaiting transfer against ${order.order_number}.`,
    heading: `New order ${order.order_number}.`,
    ledeHtml: `<span style="${STRONG}">${esc(order.shipping_address.full_name)}</span> has placed an order and will pay by bank transfer. Watch for <span style="font-family:${MONO};${STRONG}">${esc(order.order_number)}</span> as the narration, then advance the order to <span style="${STRONG}">confirmed</span>.`,
    ledeText: `${order.shipping_address.full_name} has placed an order and will pay by bank transfer. Watch for ${order.order_number} as the narration, then advance the order to confirmed.`,
    extraHtml:
      payable === null
        ? p(
            `The customer was told to transfer ${esc(formatPrice(order.subtotal_ngn))} (items only) and that the delivery fee follows. Price ${esc(order.delivery_destination)} and send the fee.`,
            NOTE,
          )
        : "",
    extraText:
      payable === null
        ? [
            `The customer was told to transfer ${formatPrice(order.subtotal_ngn)} (items only) and that the delivery fee follows. Price ${order.delivery_destination} and send the fee.`,
          ]
        : [],
  });
};

const receivedOnDeliveryVendor = (
  order: Order,
  vendorEmail: string,
  siteUrl: string,
): EmailPayload => {
  const payable = amountPayable(order);
  return vendorEmailFrom(order, "received_on_delivery", vendorEmail, siteUrl, {
    subject: `New order ${order.order_number} — ${payable === null ? "amount at the door unknown" : `${formatPrice(payable)} to collect`}`,
    preheader: `${order.shipping_address.full_name} · pay on delivery to ${order.delivery_destination}.`,
    heading: `New order ${order.order_number}.`,
    ledeHtml: `<span style="${STRONG}">${esc(order.shipping_address.full_name)}</span> has placed an order and will pay on delivery. ${
      payable === null
        ? `<span style="color:${ERROR};font-weight:600;">The amount due at the door is not known</span> — ${esc(order.delivery_destination)} has no active rate, so items come to ${esc(formatPrice(order.subtotal_ngn))} and the delivery fee is still open.`
        : `Collect <span style="font-family:${MONO};${STRONG}">${esc(formatPrice(payable))}</span> at the door, in cash or by transfer.`
    }`,
    ledeText: `${order.shipping_address.full_name} has placed an order and will pay on delivery. ${
      payable === null
        ? `The amount due at the door is NOT KNOWN — ${order.delivery_destination} has no active rate, so items come to ${formatPrice(order.subtotal_ngn)} and the delivery fee is still open.`
        : `Collect ${formatPrice(payable)} at the door, in cash or by transfer.`
    }`,
    extraHtml:
      payable === null
        ? p(
            `Price ${esc(order.delivery_destination)} before this ships — the customer has been told the exact amount will follow.`,
            NOTE,
          )
        : "",
    extraText:
      payable === null
        ? [
            `Price ${order.delivery_destination} before this ships — the customer has been told the exact amount will follow.`,
          ]
        : [],
  });
};

const confirmedVendor = (
  order: Order,
  vendorEmail: string,
  siteUrl: string,
): EmailPayload =>
  vendorEmailFrom(order, "confirmed", vendorEmail, siteUrl, {
    subject: `${order.order_number} confirmed — prepare for ${order.delivery_destination}`,
    preheader: `Payment seen. ${order.shipping_address.full_name} has been emailed.`,
    heading: `${order.order_number} confirmed.`,
    ledeHtml: `Payment is recorded${order.paid_at ? ` as of ${esc(dateLabel(order.paid_at))}` : ""} and <span style="${STRONG}">${esc(order.shipping_address.full_name)}</span> has been emailed. Next step is to prepare the piece and advance to <span style="${STRONG}">shipped</span>.`,
    ledeText: `Payment is recorded${order.paid_at ? ` as of ${dateLabel(order.paid_at)}` : ""} and ${order.shipping_address.full_name} has been emailed. Next step is to prepare the piece and advance to shipped.`,
  });

const shippedVendor = (
  order: Order,
  vendorEmail: string,
  siteUrl: string,
): EmailPayload => {
  const payable = amountPayable(order);
  const collect = order.payment_method === "pay_on_delivery";
  return vendorEmailFrom(order, "shipped", vendorEmail, siteUrl, {
    subject: `${order.order_number} shipped to ${order.delivery_destination}`,
    preheader: collect
      ? `${payable === null ? "Amount to collect still unknown." : `${formatPrice(payable)} to collect on delivery.`}`
      : `${order.shipping_address.full_name} has been emailed.`,
    heading: `${order.order_number} shipped.`,
    ledeHtml: `Marked shipped ${esc(carriage(order))} to ${esc(order.delivery_destination)}, and <span style="${STRONG}">${esc(order.shipping_address.full_name)}</span> has been emailed.${
      collect
        ? payable === null
          ? ` <span style="color:${ERROR};font-weight:600;">Payment is due at the door and the amount is not set</span> — confirm the delivery fee with the customer before handover.`
          : ` Payment of <span style="font-family:${MONO};${STRONG}">${esc(formatPrice(payable))}</span> is due at the door.`
        : ""
    }`,
    ledeText: `Marked shipped ${carriage(order)} to ${order.delivery_destination}, and ${order.shipping_address.full_name} has been emailed.${
      collect
        ? payable === null
          ? ` Payment is due at the door and the amount is NOT SET — confirm the delivery fee with the customer before handover.`
          : ` Payment of ${formatPrice(payable)} is due at the door.`
        : ""
    }`,
  });
};

const deliveredVendor = (
  order: Order,
  vendorEmail: string,
  siteUrl: string,
): EmailPayload => {
  const collect = order.payment_method === "pay_on_delivery";
  const payable = amountPayable(order);
  return vendorEmailFrom(order, "delivered", vendorEmail, siteUrl, {
    subject: `${order.order_number} delivered${collect ? ` — ${payable === null ? "payment collected" : `${formatPrice(payable)} collected`}` : ""}`,
    preheader: `Closed out. ${order.shipping_address.full_name} has been emailed.`,
    heading: `${order.order_number} delivered.`,
    ledeHtml: `Marked delivered and <span style="${STRONG}">${esc(order.shipping_address.full_name)}</span> has been emailed.${
      collect
        ? payable === null
          ? ` Payment was collected at the door; the order still carries no delivery fee, so set it if money changed hands for delivery.`
          : ` Payment of <span style="font-family:${MONO};${STRONG}">${esc(formatPrice(payable))}</span> was collected at the door.`
        : ` Payment was already confirmed${order.paid_at ? ` on ${esc(dateLabel(order.paid_at))}` : ""}.`
    }`,
    ledeText: `Marked delivered and ${order.shipping_address.full_name} has been emailed.${
      collect
        ? payable === null
          ? ` Payment was collected at the door; the order still carries no delivery fee, so set it if money changed hands for delivery.`
          : ` Payment of ${formatPrice(payable)} was collected at the door.`
        : ` Payment was already confirmed${order.paid_at ? ` on ${dateLabel(order.paid_at)}` : ""}.`
    }`,
  });
};

const cancelledVendor = (
  order: Order,
  vendorEmail: string,
  siteUrl: string,
): EmailPayload => {
  const refunded = moneyReceived(order);
  const payable = amountPayable(order);
  const note = latestNote(order)?.trim();
  return vendorEmailFrom(order, "cancelled", vendorEmail, siteUrl, {
    subject: `${order.order_number} cancelled${refunded ? " — refund owed" : ""}`,
    preheader: refunded
      ? `Money was received. A refund is owed.`
      : `No payment recorded.`,
    heading: `${order.order_number} cancelled.`,
    ledeHtml: `Cancelled, and <span style="${STRONG}">${esc(order.shipping_address.full_name)}</span> has been emailed.${
      refunded
        ? ` <span style="color:${ERROR};font-weight:600;">A refund is owed</span> — the customer was told ${payable === null ? "the payment received" : `<span style="font-family:${MONO};">${esc(formatPrice(payable))}</span>`} will be returned in full within five working days.`
        : ` No payment is recorded against it; the customer was asked to write in if they had already transferred.`
    }`,
    ledeText: `Cancelled, and ${order.shipping_address.full_name} has been emailed.${
      refunded
        ? ` A REFUND IS OWED — the customer was told ${payable === null ? "the payment received" : formatPrice(payable)} will be returned in full within five working days.`
        : ` No payment is recorded against it; the customer was asked to write in if they had already transferred.`
    }`,
    extraHtml: note ? p(`Reason recorded: “${esc(note)}”`, NOTE) : "",
    extraText: note ? [`Reason recorded: "${note}"`] : [],
  });
};

/* ── Entry point ──────────────────────────────────────────────────────── */

/**
 * Every email an order state owes, customer first then vendor.
 *
 * `kind` comes from `orderEmailKind(order)` at the call site rather than being
 * derived in here, so the notify route can also decline to resend a kind that
 * `order_emails` already records. `siteUrl` is required — pass
 * `useRuntimeConfig().public.siteUrl`; trailing slashes are trimmed for you.
 */
export const buildOrderEmails = (
  order: Order,
  kind: OrderEmailKind,
  bank: BankDetails,
  vendorEmail: string,
  siteUrl: string,
): EmailPayload[] => {
  const base = normaliseBase(siteUrl);
  switch (kind) {
    case "received_transfer":
      return [
        receivedTransferCustomer(order, bank, base),
        receivedTransferVendor(order, vendorEmail, base),
      ];
    case "received_on_delivery":
      return [
        receivedOnDeliveryCustomer(order, base),
        receivedOnDeliveryVendor(order, vendorEmail, base),
      ];
    case "confirmed":
      return [
        confirmedCustomer(order, base),
        confirmedVendor(order, vendorEmail, base),
      ];
    case "shipped":
      return [
        shippedCustomer(order, base),
        shippedVendor(order, vendorEmail, base),
      ];
    case "delivered":
      return [
        deliveredCustomer(order, base),
        deliveredVendor(order, vendorEmail, base),
      ];
    case "cancelled":
      return [
        cancelledCustomer(order, base),
        cancelledVendor(order, vendorEmail, base),
      ];
  }
};
