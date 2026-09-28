/**
 * POST /api/orders/notify — send the email an order's current state owes.
 *
 * Called by checkout once `place_order` returns, and by the admin after
 * `advance_order_status`. Both send the same two fields.
 *
 * ── Request ──────────────────────────────────────────────────────────────
 *   { "order_ref": "JB-0L1Z2S", "email": "ada@example.com" }
 *
 * ── Response ─────────────────────────────────────────────────────────────
 *   200 { ok: true,  sent: 2, deduped: false }
 *   200 { ok: true,  sent: 0, deduped: true }   already sent for this state
 *   200 { ok: false, sent: 1, deduped: false, errors: [ … ] }  partial failure
 *   400 order_ref / email missing, malformed, or an unexpected key present
 *   404 no order matches that reference and email
 *   429 IP, order or lookup budget exhausted
 *   502 the lookup itself failed
 *
 * ── Why the client sends no template name ────────────────────────────────
 * BGI's version took `{ order_ref, email, event }` and passed `event` straight
 * to the template chooser. That is the one thing this route must not do: a
 * caller who can name the template can tell a customer their unpaid order was
 * delivered, in the shop's own branding, with the shop's own account details.
 * So the body is validated to exactly two keys — an `event` field is a 400, not
 * a silently ignored extra — and the kind comes from `orderEmailKind(order)`
 * over the row read back from the database.
 *
 * What BGI does get right and this keeps: the order is **re-read through
 * `lookup_order`**, so every figure, name and address in the rendered mail
 * comes from the database. The client supplies only the two things that prove
 * it is allowed to ask (a ~1.07e9-keyspace reference and the email stored on
 * the order), never content.
 *
 * ── Layered limits ───────────────────────────────────────────────────────
 * Per IP before the lookup, so a refused caller costs one upsert and no read.
 * Per order after it, because the order number is the thing worth protecting
 * from a replay loop and it is not known until the lookup succeeds. And
 * `lookup_order` spends its own two budgets internally on a miss, which is what
 * makes reference-guessing expensive.
 */

import type { Database } from "~~/supabase/database.types";
import type {
  Order,
  OrderItem,
  OrderStatus,
  OrderStatusEvent,
  PaymentMethod,
  DeliveryMethod,
  Address,
} from "~~/app/utils/types/shop";
import { ERROR_CODES } from "~~/app/utils/constants/errorCodes";
import { orderEmailKind, type BankDetails } from "../../utils/orderEmails";
import { sendOrderEmails } from "../../utils/sendOrderEmails";

/** `JB-` + 6 Crockford chars is 9; allow for spacing and lowercase typing. */
const MAX_REF_LENGTH = 32;
const MAX_EMAIL_LENGTH = 200;

/** The only two keys accepted. Anything else is a 400. */
const ALLOWED_KEYS = ["order_ref", "email"] as const;

/**
 * Generous, because a genuine caller sends one request per order state change
 * and there are six states. Tight enough that a script cannot grind references
 * through here — and `lookup_order`'s own limits are the real wall for that.
 */
const IP_LIMIT = 20;
const IP_WINDOW = "1 hour";

/** Six kinds exist per order, so ten attempts is already a replay loop. */
const ORDER_LIMIT = 10;
const ORDER_WINDOW = "1 hour";

type LookupRow = Database["public"]["Functions"]["lookup_order"]["Returns"][number];

/**
 * The row `lookup_order` returns, as an `Order`.
 *
 * Field by field rather than `row as unknown as Order`, for two reasons. It
 * drops `is_paid` — a generated column that is deliberately not in the `Order`
 * contract — so nothing downstream can start depending on it. And the jsonb
 * columns arrive typed as `Json`, so the three casts that are genuinely
 * unavoidable are visible on three lines instead of hidden behind one blanket
 * assertion over sixteen fields.
 */
const toOrder = (row: LookupRow): Order => ({
  id: row.id,
  order_number: row.order_number,
  user_id: row.user_id,
  status: row.status as OrderStatus,
  items: row.items as unknown as OrderItem[],
  subtotal_ngn: row.subtotal_ngn,
  delivery_method: row.delivery_method as DeliveryMethod,
  delivery_destination: row.delivery_destination,
  delivery_fee_ngn: row.delivery_fee_ngn,
  total_ngn: row.total_ngn,
  shipping_address: row.shipping_address as unknown as Address,
  payment_method: row.payment_method as PaymentMethod,
  paid_at: row.paid_at,
  status_history: row.status_history as unknown as OrderStatusEvent[],
  created_at: row.created_at,
});

/**
 * `site_settings.bank_account`, as served order-scoped by
 * `get_payment_instructions`. Shape-checked rather than cast: the row is admin
 * editable jsonb, and a half-filled one should degrade to `sendOrderEmails`'
 * em-dash placeholders instead of printing `undefined` at a customer.
 */
const toBankDetails = (value: unknown): BankDetails | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const str = (key: string): string =>
    typeof record[key] === "string" ? (record[key] as string) : "";
  const bank: BankDetails = {
    bank_name: str("bank_name"),
    account_number: str("account_number"),
    account_name: str("account_name"),
  };
  return bank.bank_name || bank.account_number || bank.account_name
    ? bank
    : null;
};

export default defineEventHandler(async (event) => {
  /* ── Body ───────────────────────────────────────────────────────────── */

  const body = await readBody<unknown>(event).catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw createError({
      statusCode: 400,
      statusMessage: "A JSON body with order_ref and email is required.",
    });
  }

  const extra = Object.keys(body).filter(
    (key) => !(ALLOWED_KEYS as readonly string[]).includes(key),
  );
  if (extra.length) {
    // Loud rather than lenient. The field most likely to turn up here is
    // `event` — the one this route refuses to take from a client — and a
    // silently ignored key is how a caller comes to believe it is in charge of
    // the template.
    throw createError({
      statusCode: 400,
      statusMessage: `Unexpected field(s): ${extra.join(", ")}. Send only order_ref and email.`,
    });
  }

  const raw = body as Record<string, unknown>;
  const orderRef =
    typeof raw.order_ref === "string" ? raw.order_ref.trim() : "";
  const email = typeof raw.email === "string" ? raw.email.trim() : "";

  if (
    !orderRef ||
    !email ||
    orderRef.length > MAX_REF_LENGTH ||
    email.length > MAX_EMAIL_LENGTH
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "order_ref and email are required.",
    });
  }

  /* ── Limit by IP, before any read ───────────────────────────────────── */

  const ip = clientIp(event);
  if (!(await rateLimit(`notify:ip:${ip}`, IP_LIMIT, IP_WINDOW))) {
    throw createError({
      statusCode: 429,
      statusMessage: "Too many notification requests. Please try again later.",
    });
  }

  /* ── Re-read the order. The client's copy is never trusted. ─────────── */

  const { data, error } = await serverSupabase().rpc("lookup_order", {
    p_order_ref: orderRef,
    p_email: email,
  });

  if (error) {
    // `lookup_order` raises with the machine code in `hint` (see the error
    // contract). Its only raise is the lookup budget.
    if (error.hint === ERROR_CODES.lookupRateLimited) {
      throw createError({
        statusCode: 429,
        statusMessage: "Too many lookup attempts. Please wait a few minutes.",
      });
    }
    console.error("[notify] order lookup failed:", error.message);
    throw createError({ statusCode: 502, statusMessage: "Order lookup failed." });
  }

  const row = (data ?? [])[0];
  if (!row) {
    // A miss is a 404 and says nothing more: "wrong email" versus "no such
    // order" would turn this into a reference oracle.
    throw createError({ statusCode: 404, statusMessage: "Order not found." });
  }

  const order = toOrder(row);

  /* ── Limit by order ─────────────────────────────────────────────────── */

  if (
    !(await rateLimit(
      `notify:order:${order.order_number}`,
      ORDER_LIMIT,
      ORDER_WINDOW,
    ))
  ) {
    throw createError({
      statusCode: 429,
      statusMessage: "Too many notifications for this order.",
    });
  }

  /* ── The kind comes from the row, never from the caller ─────────────── */

  const kind = orderEmailKind(order);

  /* ── Idempotency ────────────────────────────────────────────────────── */

  // `order_emails` has PK (order_id, kind) and RLS on with no policies, so this
  // is a service-role write by design.
  //
  // The insert happens BEFORE the send, deliberately. If the process dies
  // mid-send, the row is already there and a retry declines rather than
  // sending again: the trade is a possibly-lost mail against a
  // never-duplicated one. That is the right way round for a customer — a
  // missing "your order shipped" is a support question, while a second
  // "payment confirmed" after a cancellation is a broken promise. Resend's own
  // idempotency key (minted in `buildOrderEmails`) covers the narrower case of
  // two sends inside 24 hours with a byte-identical payload; this row is the
  // durable guard.
  const { error: claimError } = await serviceSupabase()
    .from("order_emails")
    .insert({ order_id: order.id, kind });

  if (claimError) {
    if (claimError.code === "23505") {
      // Unique violation: this exact mail already went. Not an error — a
      // replay, a double-clicked admin button, or a retried request.
      return { ok: true, sent: 0, deduped: true };
    }
    console.error(
      `[notify] could not claim ${kind} for ${order.order_number}:`,
      claimError.message,
    );
    throw createError({
      statusCode: 502,
      statusMessage: "Could not record the notification.",
    });
  }

  /* ── Bank details, order-scoped ─────────────────────────────────────── */

  // `site_settings.bank_account` is not publicly readable — the contract says
  // "Account details shown after you order" — so it is fetched through the
  // definer RPC that requires the order id AND the email stored on it. Only a
  // bank-transfer order needs them, and the RPC returns nothing for any other
  // payment method anyway, so the call is skipped rather than wasted.
  let bank: BankDetails | null = null;
  if (order.payment_method === "bank_transfer") {
    const { data: instructions, error: bankError } = await serverSupabase().rpc(
      "get_payment_instructions",
      { p_order_id: order.id, p_email: email },
    );
    if (bankError) {
      // Not fatal. `sendOrderEmails` renders em dashes for a missing account
      // and the vendor copy makes the gap obvious — better than withholding
      // the whole mail.
      console.error(
        `[notify] bank details unavailable for ${order.order_number}:`,
        bankError.message,
      );
    } else {
      bank = toBankDetails(instructions);
      if (!bank) {
        console.warn(
          `[notify] site_settings.bank_account is empty — ${order.order_number} will show placeholders.`,
        );
      }
    }
  }

  /* ── Send ───────────────────────────────────────────────────────────── */

  const { sent, errors } = await sendOrderEmails(order, kind, { bank });

  if (errors?.length) {
    // The provider's own text names the recipient and its refusal reason.
    // It stays in the log; the client gets one opaque sentence.
    console.error(
      `[notify] ${kind} for ${order.order_number} had ${errors.length} failure(s):`,
      errors.join("; "),
    );
    return {
      ok: false,
      sent,
      deduped: false,
      errors: ["Some notifications could not be sent."],
    };
  }

  return { ok: true, sent, deduped: false };
});
