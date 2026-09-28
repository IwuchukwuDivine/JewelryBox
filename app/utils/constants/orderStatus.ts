import type { OrderStatus, PaymentMethod } from "~/utils/types/shop";

/**
 * The order lifecycle, in one place.
 *
 * One status column, two lanes through it:
 *
 *   bank_transfer    received → confirmed → shipped → delivered
 *   pay_on_delivery  received →            shipped → delivered
 *
 * `confirmed` means the money has been seen. A pay-on-delivery order is not
 * paid until it is `delivered`, so it never passes through `confirmed`.
 * `cancelled` is reachable from anything that has not been delivered.
 *
 * The database mirrors this map in `advance_order_status()`. If you change it
 * here, change it there in the same commit — the Phase G tests assert both
 * agree.
 */

/** Statuses a customer sees on the timeline, in order, per payment method. */
export const ORDER_FLOW: Record<PaymentMethod, readonly OrderStatus[]> = {
  bank_transfer: ["received", "confirmed", "shipped", "delivered"],
  pay_on_delivery: ["received", "shipped", "delivered"],
} as const;

/** Terminal states — nothing advances out of these. */
export const TERMINAL_STATUSES: readonly OrderStatus[] = [
  "delivered",
  "cancelled",
] as const;

export interface StatusDefinition {
  value: OrderStatus;
  /** Admin-facing label. */
  label: string;
  /** Customer-facing line on the order timeline. */
  customerLabel: string;
  /** Semantic token name in main.css — `--color-success` etc. */
  tone: "neutral" | "info" | "success" | "warning" | "error";
}

export const ORDER_STATUSES: readonly StatusDefinition[] = [
  {
    value: "received",
    label: "Received",
    customerLabel: "Order received",
    tone: "info",
  },
  {
    value: "confirmed",
    label: "Payment confirmed",
    customerLabel: "Payment confirmed",
    tone: "success",
  },
  {
    value: "shipped",
    label: "Shipped",
    customerLabel: "On its way",
    tone: "info",
  },
  {
    value: "delivered",
    label: "Delivered",
    customerLabel: "Delivered",
    tone: "success",
  },
  {
    value: "cancelled",
    label: "Cancelled",
    customerLabel: "Cancelled",
    tone: "error",
  },
] as const;

export const statusDefinition = (status: OrderStatus): StatusDefinition =>
  ORDER_STATUSES.find((s) => s.value === status) ?? ORDER_STATUSES[0]!;

export const PAYMENT_METHODS: readonly {
  value: PaymentMethod;
  label: string;
  description: string;
}[] = [
  {
    value: "bank_transfer",
    label: "Bank transfer",
    description: "Account details shown after you order. Your order number is the reference.",
  },
  {
    value: "pay_on_delivery",
    label: "Pay on delivery",
    description: "Pay in cash or by transfer when your piece reaches you.",
  },
] as const;

/**
 * Every status this order could legally move to next.
 *
 * Returns `[]` for terminal states. Admin UI must build its controls from
 * this — never from a hard-coded list — so the two lanes stay correct.
 */
export const nextStatuses = (
  status: OrderStatus,
  paymentMethod: PaymentMethod,
): OrderStatus[] => {
  if (TERMINAL_STATUSES.includes(status)) return [];

  const flow = ORDER_FLOW[paymentMethod];
  const index = flow.indexOf(status);

  // A status outside this method's flow (e.g. `confirmed` on a
  // pay-on-delivery order) is corrupt data — offer only cancellation.
  if (index === -1) return ["cancelled"];

  const next = flow[index + 1];
  return next ? [next, "cancelled"] : ["cancelled"];
};

/** Whether `to` is a legal next step. The single predicate the DB mirrors. */
export const canTransition = (
  from: OrderStatus,
  to: OrderStatus,
  paymentMethod: PaymentMethod,
): boolean => nextStatuses(from, paymentMethod).includes(to);

/** An order counts as paid once the money has actually been received. */
export const isPaid = (
  status: OrderStatus,
  paymentMethod: PaymentMethod,
): boolean =>
  paymentMethod === "bank_transfer"
    ? status === "confirmed" || status === "shipped" || status === "delivered"
    : status === "delivered";
