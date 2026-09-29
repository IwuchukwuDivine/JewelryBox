/**
 * Resend delivery for order emails.
 *
 * Contract: **this never throws.** Email is a notification, not part of the
 * transaction — a checkout must not fail because a mail provider is having a
 * bad minute. Every failure is logged under `[orders]` and returned in
 * `errors`, and the caller decides whether that matters (the notify route
 * records what was actually sent in `order_emails`).
 *
 * Three things it does that BGI's sequential loop did not:
 *
 * 1. **Idempotency key per (order, kind, recipient)** — Resend returns the
 *    original response for a repeated key + identical payload within 24 hours,
 *    so a double-clicked admin button, a replayed notify request or an internal
 *    retry cannot send the same mail twice. The key is minted in
 *    `buildOrderEmails`, next to the content it identifies.
 * 2. **Bounded retry with backoff, on transient statuses only** — 429 and 5xx
 *    are retried: 3 attempts, waiting ~250ms then ~1s between them (the 2s
 *    rung of the ladder is there if `MAX_ATTEMPTS` is ever raised). A 4xx is
 *    never retried — a malformed address or an unverified domain will not
 *    become good, and retrying it only delays the response and burns
 *    rate-limit budget. A network error or timeout counts as transient.
 * 3. **`Promise.allSettled` across recipients** — the customer's mail and the
 *    vendor's go out concurrently and independently. One failing does not
 *    cancel or delay the other.
 *
 * With no `RESEND_API_KEY` it warns and returns `{ sent: 0 }`. That is the
 * documented local-dev path: the whole order flow stays exercisable without a
 * key, and tests stub this module rather than the network.
 */

import type { Order } from "~~/app/utils/types/shop";
import {
  buildOrderEmails,
  type BankDetails,
  type EmailPayload,
  type OrderEmailKind,
} from "./orderEmails";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/**
 * 3 attempts total. A delay is applied *before* attempts 2 and 3 — so 250ms
 * and 1s with the current cap; the 2s rung applies if the cap is raised.
 */
const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [250, 1_000, 2_000] as const;

/** Per-attempt ceiling, so a hanging provider cannot hold a request open. */
const REQUEST_TIMEOUT_MS = 10_000;

export interface SendOrderEmailsOptions {
  /**
   * The shop's account details, for the bank-transfer templates. Read from
   * `site_settings.bank_account` by the caller — this module does no database
   * work. Omitted (or partially filled) degrades to placeholder-free blanks
   * rather than printing `undefined` at the customer.
   */
  bank?: Partial<BankDetails> | null;
  /** Overrides `runtimeConfig.vendorEmail`. Useful in tests. */
  vendorEmail?: string;
  /**
   * Overrides `runtimeConfig.public.siteUrl` — the absolute base every link in
   * the templates is built from. Useful in tests and previews.
   */
  siteUrl?: string;
  /**
   * Send only the customer's mail, or only the vendor's. Default: both.
   * The notify route uses this when `order_emails` shows one already went.
   */
  only?: "customer" | "vendor";
}

export interface SendOrderEmailsResult {
  sent: number;
  errors?: string[];
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** 429 and 5xx are worth another go. Everything else in the 4xx band is not. */
const isRetryableStatus = (status: number): boolean =>
  status === 429 || status >= 500;

/**
 * Never let a missing `site_settings.bank_account` print `undefined` into a
 * customer's inbox. An em dash reads as "we owe you this detail", which is
 * true, and the vendor copy of the same mail makes the gap obvious.
 */
const resolveBank = (bank: SendOrderEmailsOptions["bank"]): BankDetails => ({
  bank_name: bank?.bank_name?.trim() || "—",
  account_number: bank?.account_number?.trim() || "—",
  account_name: bank?.account_name?.trim() || "—",
});

/** Redacts the local part of an address for logs. */
const maskEmail = (address: string): string => {
  const at = address.lastIndexOf("@");
  if (at < 1) return "***";
  return `${address.slice(0, 1)}***${address.slice(at)}`;
};

interface SendContext {
  apiKey: string;
  from: string;
  orderNumber: string;
  kind: OrderEmailKind;
}

/**
 * One payload, up to `MAX_ATTEMPTS` tries. Resolves with an error string
 * rather than rejecting, so the caller's bookkeeping stays branch-free.
 */
const deliver = async (
  payload: EmailPayload,
  ctx: SendContext,
): Promise<{ ok: true } | { ok: false; error: string }> => {
  const label = `${ctx.kind} → ${maskEmail(payload.to)} (${ctx.orderNumber})`;
  let lastError = "unknown error";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) {
      await sleep(BACKOFF_MS[attempt - 2] ?? 2_000);
    }

    try {
      const response = await fetch(RESEND_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ctx.apiKey}`,
          "Content-Type": "application/json",
          // Same key + same payload inside 24h ⇒ the original response, no
          // second send. This is what makes the retry above safe.
          "Idempotency-Key": payload.idempotencyKey,
        },
        body: JSON.stringify({
          from: ctx.from,
          to: [payload.to],
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
          ...(payload.replyTo ? { reply_to: payload.replyTo } : {}),
          headers: {
            // Groups the lifecycle mails for one order into a single inbox
            // thread instead of six unrelated messages.
            "X-Entity-Ref-ID": `${ctx.orderNumber}/${ctx.kind}`,
          },
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (response.ok) return { ok: true };

      const detail = (await response.text().catch(() => "")).slice(0, 500);
      lastError = `${response.status} ${detail}`.trim();

      if (!isRetryableStatus(response.status)) {
        console.error(`[orders] Resend rejected ${label}: ${lastError}`);
        return { ok: false, error: `${payload.to}: ${response.status}` };
      }

      console.warn(
        `[orders] Resend ${response.status} on ${label}, attempt ${attempt}/${MAX_ATTEMPTS}: ${detail}`,
      );
    } catch (err) {
      // Network failure, DNS, or the per-attempt timeout — all transient.
      lastError = err instanceof Error ? err.message : String(err);
      console.warn(
        `[orders] Resend request failed for ${label}, attempt ${attempt}/${MAX_ATTEMPTS}: ${lastError}`,
      );
    }
  }

  console.error(
    `[orders] Gave up on ${label} after ${MAX_ATTEMPTS} attempts: ${lastError}`,
  );
  return { ok: false, error: `${payload.to}: ${lastError}` };
};

/**
 * Send the emails an order state owes.
 *
 * `kind` is passed in rather than derived so the caller stays in charge of
 * idempotency — it has already checked `order_emails` for this (order, kind)
 * pair. Use `orderEmailKind(order)` to obtain it from the row; never from a
 * client-supplied event name.
 */
export const sendOrderEmails = async (
  order: Order,
  kind: OrderEmailKind,
  opts: SendOrderEmailsOptions = {},
): Promise<SendOrderEmailsResult> => {
  let payloads: EmailPayload[];
  let apiKey: string;
  let from: string;

  // Config reads and template rendering are inside the guard too: a thrown
  // error from either would otherwise escape a function that promises not to.
  try {
    const config = useRuntimeConfig();
    apiKey = config.resendApiKey;
    from = config.fromEmail;
    const vendorEmail = opts.vendorEmail || config.vendorEmail;
    // The authoritative base URL. `public.siteUrl` is set in every
    // environment, so a missing value here is a misconfiguration worth naming
    // rather than papering over with a hardcoded domain.
    const siteUrl = opts.siteUrl || config.public.siteUrl;
    if (!siteUrl) {
      console.error("[orders] public.siteUrl not set — emails skipped.");
      return { sent: 0, errors: ["siteUrl not configured"] };
    }

    if (!apiKey) {
      console.warn(
        `[orders] RESEND_API_KEY not set — ${kind} email for ${order.order_number} skipped.`,
      );
      return { sent: 0 };
    }
    if (!from) {
      console.error("[orders] FROM_EMAIL not set — emails skipped.");
      return { sent: 0, errors: ["fromEmail not configured"] };
    }
    if (!vendorEmail && opts.only !== "customer") {
      // Not fatal: the customer still gets their mail.
      console.warn(
        "[orders] VENDOR_EMAIL not set — vendor notification skipped.",
      );
    }

    const built = buildOrderEmails(
      order,
      kind,
      resolveBank(opts.bank),
      vendorEmail,
      siteUrl,
    );
    // buildOrderEmails returns [customer, vendor], in that order.
    const [customer, vendor] = built;
    payloads = [
      ...(opts.only === "vendor" ? [] : customer ? [customer] : []),
      ...(opts.only === "customer" ? [] : vendor && vendorEmail ? [vendor] : []),
    ].filter((payload) => Boolean(payload.to));

    if (payloads.length === 0) {
      console.warn(
        `[orders] No recipients for ${kind} on ${order.order_number} — nothing sent.`,
      );
      return { sent: 0 };
    }
  } catch (err) {
    console.error("[orders] Failed to build order emails:", err);
    return {
      sent: 0,
      errors: [err instanceof Error ? err.message : String(err)],
    };
  }

  const ctx: SendContext = {
    apiKey,
    from,
    orderNumber: order.order_number,
    kind,
  };

  const settled = await Promise.allSettled(
    payloads.map((payload) => deliver(payload, ctx)),
  );

  let sent = 0;
  const errors: string[] = [];

  settled.forEach((outcome, index) => {
    if (outcome.status === "fulfilled") {
      if (outcome.value.ok) sent++;
      else errors.push(outcome.value.error);
      return;
    }
    // `deliver` catches its own failures, so this is belt-and-braces.
    const reason =
      outcome.reason instanceof Error
        ? outcome.reason.message
        : String(outcome.reason);
    console.error("[orders] Unexpected send failure:", reason);
    errors.push(`${payloads[index]?.to ?? "unknown"}: ${reason}`);
  });

  console.info(
    `[orders] ${kind} for ${order.order_number}: ${sent}/${payloads.length} sent.`,
  );

  return errors.length ? { sent, errors } : { sent };
};
