/**
 * POST /api/contact — the contact form, delivered to the shop's inbox.
 *
 * ── Request ──────────────────────────────────────────────────────────────
 *   { "name": "Ada", "email": "ada@example.com",
 *     "message": "Do you size rings?", "subject": "Ring sizing" }
 *   `subject` is optional; unknown keys are ignored (see below).
 *
 * ── Response ─────────────────────────────────────────────────────────────
 *   200 { ok: true,  sent: 1 }
 *   200 { ok: true,  sent: 0 }   RESEND_API_KEY unset — the local-dev path
 *   400 a field is missing, over its cap, or the email is malformed
 *   429 three messages already sent from this IP or address this hour
 *   502 { ok: false, sent: 0 }   the provider genuinely refused
 *
 * ── This is an injection boundary ────────────────────────────────────────
 * Every field is written by a stranger and lands in the vendor's inbox, so:
 *
 *   · `esc()` wraps every HTML interpolation. It is a local copy rather than an
 *     import from `orderEmails.ts`, where it is deliberately private — a
 *     security primitive should be visible in the file that depends on it, and
 *     exporting it would widen that module's surface for no reason.
 *   · `singleLine()` strips control characters from every field and collapses
 *     newlines in the ones that become mail headers (`subject`, the display
 *     name, `reply_to`). The Resend API takes JSON and builds the headers
 *     itself, so this is defence in depth rather than the only guard — but a
 *     CRLF in a subject line is the classic way to forge headers and it costs
 *     one regex to make impossible here.
 *   · The message keeps its newlines (rendered as `<br />` after escaping) and
 *     is capped, so no amount of input can produce markup or an unbounded body.
 *
 * Unknown keys are ignored rather than rejected, unlike `/api/orders/notify`.
 * There the strictness earns something specific — an `event` field would be a
 * client trying to choose an email template. Here every field the route reads
 * is escaped and capped, a public form legitimately carries honeypots and
 * campaign parameters, and a 400 on an extra field would break the form for a
 * reason that protects nobody.
 *
 * ── Never throws past the send ───────────────────────────────────────────
 * Same posture as `sendOrderEmails`: the provider failing is logged under
 * `[contact]` and reported as a 502, never as an unhandled exception. With no
 * `RESEND_API_KEY` it logs and reports `sent: 0`, so the form is exercisable
 * locally exactly as the order mail is.
 */

import { createHash } from "node:crypto";
import { SITE_NAME } from "~~/app/utils/constants/brand";
import {
  BORDER,
  SURFACE,
  SURFACE_ELEVATED,
  SURFACE_MUTED,
  TEXT_MUTED,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from "~~/server/utils/emailPalette";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/* ── Limits ───────────────────────────────────────────────────────────── */

const MAX_NAME = 120;
const MAX_EMAIL = 200;
const MAX_SUBJECT = 150;
const MAX_MESSAGE = 2_000;

/** Three an hour is plenty for a real enquiry and useless for a spammer. */
const RATE_LIMIT = 3;
const RATE_WINDOW = "1 hour";

/** A form submit has a person waiting, so retry once and briefly. */
const MAX_ATTEMPTS = 2;
const BACKOFF_MS = 400;
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Deliberately stricter than the RFC.
 *
 * The local part excludes whitespace, quotes, commas, semicolons, colons,
 * angle brackets, brackets and backslashes — every character that could turn
 * one address into a list or an escaped header — and the domain must end in a
 * real-looking TLD. It rejects a handful of technically-legal addresses nobody
 * uses, which is the correct trade at a public endpoint that feeds a mail
 * header.
 */
const EMAIL_RE =
  /^[^\s@,;:<>"'\\()[\]]{1,64}@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}$/;

/* ── Primitives ───────────────────────────────────────────────────────── */

/** The injection boundary. Every HTML interpolation goes through this. */
const esc = (value: unknown): string =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

/** Strips control characters, including the CR/LF used to forge headers. */
// eslint-disable-next-line no-control-regex
const CONTROL_RE = /[\u0000-\u001F\u007F]/g;

const singleLine = (value: string): string =>
  value.replace(CONTROL_RE, " ").replace(/\s+/g, " ").trim();

/** Keeps paragraph breaks, drops every other control character. */
const multiLine = (value: string): string =>
  value
    .replace(/\r\n?/g, "\n")
    .replace(CONTROL_RE, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const field = (body: Record<string, unknown>, key: string): string =>
  typeof body[key] === "string" ? (body[key] as string) : "";

/** Redacts the local part of an address for logs. */
const maskEmail = (address: string): string => {
  const at = address.lastIndexOf("@");
  return at < 1 ? "***" : `${address.slice(0, 1)}***${address.slice(at)}`;
};

const isRetryableStatus = (status: number): boolean =>
  status === 429 || status >= 500;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/* ── Templates ────────────────────────────────────────────────────────── */

const DISPLAY = "Georgia,'Times New Roman',Times,serif";
const BODY =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MICRO = `font-family:${BODY};font-size:10px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:${TEXT_MUTED};`;

interface Enquiry {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const html = (enquiry: Enquiry): string => {
  const row = (label: string, value: string): string => `
            <tr>
              <td style="padding:5px 0;font-family:${BODY};font-size:12.5px;color:${TEXT_MUTED};white-space:nowrap;">${esc(label)}</td>
              <td style="padding:5px 0 5px 14px;font-family:${BODY};font-size:14px;font-weight:600;color:${TEXT_PRIMARY};">${value}</td>
            </tr>`;
  return `<!doctype html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>${esc(`Enquiry from ${enquiry.name}`)}</title>
</head>
<body style="margin:0;padding:0;width:100%;background-color:${SURFACE};color:${TEXT_PRIMARY};-webkit-text-size-adjust:100%;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${SURFACE};">
  <tr>
    <td align="center" style="padding:32px 12px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;width:100%;background-color:${SURFACE_ELEVATED};border:1px solid ${BORDER};border-radius:3px;">
        <tr>
          <td style="padding:22px 32px;border-bottom:1px solid ${BORDER};font-family:${DISPLAY};font-size:15px;letter-spacing:0.26em;color:${TEXT_PRIMARY};">${esc(SITE_NAME.toUpperCase())}</td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 20px;font-family:${DISPLAY};font-size:24px;line-height:1.25;font-weight:400;color:${TEXT_PRIMARY};">${esc(enquiry.subject)}</h1>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;border-collapse:collapse;">
              ${row("From", esc(enquiry.name))}
              ${row("Email", `<a href="mailto:${esc(enquiry.email)}" style="color:${TEXT_PRIMARY};text-decoration:underline;">${esc(enquiry.email)}</a>`)}
            </table>
            <p style="margin:0 0 8px;${MICRO}">Message</p>
            <p style="margin:0 0 24px;padding:18px 20px;background-color:${SURFACE_MUTED};border:1px solid ${BORDER};border-radius:2px;font-family:${BODY};font-size:14px;line-height:1.7;color:${TEXT_SECONDARY};">${esc(enquiry.message).replaceAll("\n", "<br />")}</p>
            <p style="margin:0;font-family:${BODY};font-size:12.5px;line-height:1.65;color:${TEXT_MUTED};">Reply to this email to answer ${esc(enquiry.name)} directly.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid ${BORDER};font-family:${BODY};font-size:11.5px;line-height:1.7;color:${TEXT_MUTED};">
            Sent from the ${esc(SITE_NAME)} contact form.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
};

/** Plain by construction — raw values, never escaped. */
const text = (enquiry: Enquiry): string =>
  [
    `${SITE_NAME.toUpperCase()} — CONTACT FORM`,
    "—".repeat(46),
    "",
    enquiry.subject,
    "",
    `From:  ${enquiry.name}`,
    `Email: ${enquiry.email}`,
    "",
    "MESSAGE",
    enquiry.message,
    "",
    "—".repeat(46),
    `Reply to this email to answer ${enquiry.name} directly.`,
  ].join("\n");

/* ── Route ────────────────────────────────────────────────────────────── */

export default defineEventHandler(async (event) => {
  /* ── Validate ───────────────────────────────────────────────────────── */

  const body = await readBody<unknown>(event).catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw createError({
      statusCode: 400,
      statusMessage: "A JSON body with name, email and message is required.",
    });
  }

  const raw = body as Record<string, unknown>;
  const name = singleLine(field(raw, "name"));
  const email = singleLine(field(raw, "email")).toLowerCase();
  const subject = singleLine(field(raw, "subject"));
  const message = multiLine(field(raw, "message"));

  // Caps are checked on the sanitised values: a 5,000-character message is
  // still 5,000 characters after control stripping, and measuring what will
  // actually be stored is the only check that cannot be walked around with
  // padding.
  const problems: string[] = [];
  if (!name) problems.push("name is required");
  else if (name.length > MAX_NAME) problems.push(`name exceeds ${MAX_NAME}`);
  if (!email) problems.push("email is required");
  else if (email.length > MAX_EMAIL) problems.push(`email exceeds ${MAX_EMAIL}`);
  else if (!EMAIL_RE.test(email)) problems.push("email is not a valid address");
  if (subject.length > MAX_SUBJECT)
    problems.push(`subject exceeds ${MAX_SUBJECT}`);
  if (!message) problems.push("message is required");
  else if (message.length > MAX_MESSAGE)
    problems.push(`message exceeds ${MAX_MESSAGE}`);

  if (problems.length) {
    throw createError({
      statusCode: 400,
      statusMessage: problems.join("; "),
    });
  }

  /* ── Limit ──────────────────────────────────────────────────────────── */

  // Two keys, because either alone is trivially rotated: a botnet defeats the
  // IP limit, and one host defeats the email limit by inventing addresses.
  const ip = clientIp(event);
  const allowed =
    (await rateLimit(`contact:ip:${ip}`, RATE_LIMIT, RATE_WINDOW)) &&
    (await rateLimit(`contact:email:${email}`, RATE_LIMIT, RATE_WINDOW));

  if (!allowed) {
    throw createError({
      statusCode: 429,
      statusMessage:
        "You have sent us several messages already. Please give us a little time to reply.",
    });
  }

  /* ── Config ─────────────────────────────────────────────────────────── */

  const config = useRuntimeConfig();
  const apiKey = config.resendApiKey;
  const from = config.fromEmail;
  const to = config.vendorEmail;

  if (!apiKey) {
    // The documented local-dev path, matching `sendOrderEmails`: the whole form
    // stays exercisable with no key, and the message is logged so a developer
    // can see it arrived.
    console.warn(
      `[contact] RESEND_API_KEY not set — enquiry from ${maskEmail(email)} not sent.`,
    );
    return { ok: true, sent: 0 };
  }

  if (!from || !to) {
    console.error(
      "[contact] FROM_EMAIL / VENDOR_EMAIL not set — nowhere to deliver the enquiry.",
    );
    setResponseStatus(event, 502);
    return { ok: false, sent: 0 };
  }

  /* ── Send ───────────────────────────────────────────────────────────── */

  const enquiry: Enquiry = {
    name,
    email,
    subject: subject || `Enquiry from ${name}`,
    message,
  };

  // A double-clicked submit button inside 24 hours reaches Resend with the same
  // key and the same payload, so it returns the original response instead of
  // sending twice. Hashed rather than raw so no address ends up in a header.
  const idempotencyKey = `contact/${createHash("sha256")
    .update(`${email}|${enquiry.subject}|${enquiry.message}`)
    .digest("hex")
    .slice(0, 48)}`;

  let lastError = "unknown error";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) await sleep(BACKOFF_MS);

    try {
      const response = await fetch(RESEND_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject: `Contact form — ${enquiry.subject}`,
          html: html(enquiry),
          text: text(enquiry),
          // So the vendor can answer from their inbox without copying the
          // address out of the body. The value passed the strict regex above,
          // so it cannot carry a comma, an angle bracket or a newline.
          reply_to: enquiry.email,
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (response.ok) {
        console.info(`[contact] enquiry from ${maskEmail(email)} sent.`);
        return { ok: true, sent: 1 };
      }

      const detail = (await response.text().catch(() => "")).slice(0, 500);
      lastError = `${response.status} ${detail}`.trim();

      if (!isRetryableStatus(response.status)) {
        // A 4xx will not become good — a malformed address or an unverified
        // sending domain is a configuration fault, not a transient one.
        console.error(`[contact] Resend rejected the enquiry: ${lastError}`);
        break;
      }

      console.warn(
        `[contact] Resend ${response.status}, attempt ${attempt}/${MAX_ATTEMPTS}: ${detail}`,
      );
    } catch (err) {
      // Network failure, DNS, or the per-attempt timeout — all transient.
      lastError = err instanceof Error ? err.message : String(err);
      console.warn(
        `[contact] request failed, attempt ${attempt}/${MAX_ATTEMPTS}: ${lastError}`,
      );
    }
  }

  console.error(`[contact] enquiry from ${maskEmail(email)} not delivered: ${lastError}`);
  setResponseStatus(event, 502);
  return { ok: false, sent: 0 };
});
