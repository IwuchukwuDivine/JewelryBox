import type { Order } from "~/utils/types/shop";
import { MOCK_PRODUCTS } from "~/utils/mock/products";

/**
 * Order fixtures covering both lanes of the status flow, so `Order/Timeline`
 * and `Order/StatusBadge` can be reviewed against real shapes:
 *
 *   bank_transfer    received → confirmed → shipped → delivered
 *   pay_on_delivery  received ──────────→ shipped → delivered
 *
 * Includes a cancelled order and one to an unpriced destination
 * (`delivery_fee_ngn: null`), which is not an error — the fee follows by email.
 */

const lineFrom = (slug: string, quantity = 1, variantIndex?: number) => {
  const product = MOCK_PRODUCTS.find((p) => p.slug === slug);
  if (!product) throw new Error(`mock order references unknown product: ${slug}`);
  const variant =
    variantIndex === undefined ? undefined : product.variants?.[variantIndex];
  return {
    product_id: product.id,
    name: product.name,
    brand: product.brand,
    price_ngn: variant?.price_ngn ?? product.price_ngn,
    quantity,
    image: product.images[0] ?? "",
    ...(variant ? { variant_id: variant.id, variant_label: variant.label } : {}),
  };
};

const LAGOS_ADDRESS = {
  full_name: "Adaeze Okonkwo",
  email: "adaeze@example.com",
  phone: "08030000000",
  line1: "12 Admiralty Way",
  city: "Lekki",
  state: "Lagos",
  area: "Lekki Phase 1",
  country: "NG",
} as const;

const ABUJA_ADDRESS = {
  full_name: "Adaeze Okonkwo",
  email: "adaeze@example.com",
  phone: "08030000000",
  line1: "Plot 4, Adetokunbo Ademola Crescent",
  line2: "Wuse II",
  city: "Abuja",
  state: "FCT (Abuja)",
  country: "NG",
} as const;

export const MOCK_ORDERS: Order[] = [
  /* Bank transfer, mid-flight. Paid at `confirmed`. */
  {
    id: "ord_0392",
    order_number: "JB-7K3QMZ",
    user_id: "usr_00214",
    status: "shipped",
    items: [lineFrom("meridian-automatic-40", 1, 0)],
    subtotal_ngn: 1_850_000,
    delivery_method: "dispatch",
    delivery_destination: "Lekki Phase 1",
    delivery_fee_ngn: 8_000,
    total_ngn: 1_858_000,
    shipping_address: { ...LAGOS_ADDRESS },
    payment_method: "bank_transfer",
    paid_at: "2026-09-15T11:20:00Z",
    status_history: [
      { status: "received", at: "2026-09-14T16:02:00Z" },
      { status: "confirmed", at: "2026-09-15T11:20:00Z", note: "Transfer seen, reference JB-7K3QMZ." },
      { status: "shipped", at: "2026-09-16T09:41:00Z", note: "Sealed and insured. Rider dispatched." },
    ],
    created_at: "2026-09-14T16:02:00Z",
  },

  /* Pay on delivery, complete. Paid at `delivered` — never `confirmed`. */
  {
    id: "ord_0311",
    order_number: "JB-4NPX2R",
    user_id: "usr_00214",
    status: "delivered",
    items: [lineFrom("moissanite-studs"), lineFrom("gold-hoops")],
    subtotal_ngn: 710_000,
    delivery_method: "flight",
    delivery_destination: "FCT (Abuja)",
    delivery_fee_ngn: 12_000,
    total_ngn: 722_000,
    shipping_address: { ...ABUJA_ADDRESS },
    payment_method: "pay_on_delivery",
    paid_at: "2026-08-05T14:30:00Z",
    status_history: [
      { status: "received", at: "2026-08-02T10:15:00Z" },
      { status: "shipped", at: "2026-08-03T08:00:00Z" },
      { status: "delivered", at: "2026-08-05T14:30:00Z", note: "Signed for." },
    ],
    created_at: "2026-08-02T10:15:00Z",
  },

  /* Bank transfer, just placed. Awaiting the transfer against the reference. */
  {
    id: "ord_0417",
    order_number: "JB-9TBH6V",
    user_id: null,
    status: "received",
    items: [lineFrom("azure-pendant", 1, 1)],
    subtotal_ngn: 665_000,
    delivery_method: "dispatch",
    delivery_destination: "Ikoyi",
    delivery_fee_ngn: 6_500,
    total_ngn: 671_500,
    shipping_address: {
      full_name: "Tunde Adeyemi",
      email: "tunde@example.com",
      phone: "08120000000",
      line1: "5 Queens Drive",
      city: "Ikoyi",
      state: "Lagos",
      area: "Ikoyi",
      country: "NG",
    },
    payment_method: "bank_transfer",
    paid_at: null,
    status_history: [{ status: "received", at: "2026-09-27T18:44:00Z" }],
    created_at: "2026-09-27T18:44:00Z",
  },

  /* Unpriced destination — placed with a null fee, quoted by email after. */
  {
    id: "ord_0421",
    order_number: "JB-2WQK8D",
    user_id: "usr_00214",
    status: "received",
    items: [lineFrom("curb-chain-bracelet", 2)],
    subtotal_ngn: 960_000,
    delivery_method: "flight",
    delivery_destination: "Zamfara",
    delivery_fee_ngn: null,
    total_ngn: 960_000,
    shipping_address: {
      full_name: "Adaeze Okonkwo",
      email: "adaeze@example.com",
      phone: "08030000000",
      line1: "14 Canteen Road",
      city: "Gusau",
      state: "Zamfara",
      country: "NG",
    },
    payment_method: "pay_on_delivery",
    paid_at: null,
    status_history: [{ status: "received", at: "2026-09-28T07:12:00Z" }],
    created_at: "2026-09-28T07:12:00Z",
  },

  /* Cancelled from `received`, the bank-transfer lane. */
  {
    id: "ord_0207",
    order_number: "JB-5ZFM3J",
    user_id: "usr_00214",
    status: "cancelled",
    items: [lineFrom("tennis-bracelet")],
    subtotal_ngn: 1_450_000,
    delivery_method: "dispatch",
    delivery_destination: "Ikeja",
    delivery_fee_ngn: 5_000,
    total_ngn: 1_455_000,
    shipping_address: { ...LAGOS_ADDRESS, city: "Ikeja", area: "Ikeja" },
    payment_method: "bank_transfer",
    paid_at: null,
    status_history: [
      { status: "received", at: "2026-05-19T12:00:00Z" },
      { status: "cancelled", at: "2026-05-21T09:30:00Z", note: "Cancelled at the client's request." },
    ],
    created_at: "2026-05-19T12:00:00Z",
  },
];
