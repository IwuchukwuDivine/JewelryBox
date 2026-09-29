/**
 * Client care answers, grouped the way the prototype groups them.
 *
 * These are the house's public promises, so they must match how the shop
 * actually works rather than how a generic store works:
 *
 *   · Payment is bank transfer or pay on delivery. No cards, no gateway.
 *   · The order number IS the bank transfer reference.
 *   · Lagos travels by dispatch rider, priced per area, 1–2 working days.
 *     Every other state travels by air freight, priced per state, 2–4.
 *   · An unpriced destination still takes the order; the fee follows by email
 *     and nothing is dispatched until it is agreed.
 *
 * Two answers are carried over verbatim from the design prototype and are
 * marked as such. The prototype's "Is delivery free?" answer quoted flat
 * ₦5,000 / ₦12,000 / free-over-₦1M figures; those were retired with the
 * `delivery_rates` table, so that one is rewritten without inventing
 * replacements. See design/README.md.
 *
 * Shape is deliberately `{ question, answer }` so a list can be handed
 * straight to `faqSchema()` in app/utils/seo/schema.ts.
 */

export interface FaqQuestion {
  question: string;
  answer: string;
}

export interface FaqCategory {
  /** Chip label, and the category's display name. */
  label: string;
  /** Stable key for chip state and accordion item values. */
  slug: string;
  entries: FaqQuestion[];
}

export const FAQ_CATEGORIES: readonly FaqCategory[] = [
  {
    label: "Orders",
    slug: "orders",
    entries: [
      {
        question: "How do I place an order?",
        answer:
          "Add the piece to your bag and check out in three steps: who you are, where it goes, and how you pay. You do not need to sign in — an email address and a phone number are enough for us to confirm the order and reach you on delivery day.",
      },
      {
        question: "Can I change or cancel an order after placing it?",
        answer:
          "Yes, while it still reads Received and has not been sealed for dispatch. Message the concierge with your order number and we will amend or cancel it. Once a piece has shipped it follows the returns route instead.",
      },
      {
        question: "Where do I find my order number?",
        answer:
          "On the confirmation screen the moment the order is placed, and again in the confirmation email. It looks like JB-XXXXXX. Quote it in every message to us, and use it as the reference on your bank transfer.",
      },
    ],
  },
  {
    label: "Delivery",
    slug: "delivery",
    entries: [
      {
        // Verbatim from the design prototype.
        question: "How long does delivery take?",
        answer:
          "Lagos: 1–2 working days. All other states: 2–4. Every parcel is insured and signed for.",
      },
      {
        question: "Is delivery free?",
        answer:
          "Delivery is charged at what it costs us to move the piece safely. Lagos is priced per area and every other state per route, so the exact figure appears at checkout as soon as you give the address — there is no flat fee to guess at.",
      },
      {
        question: "How does my piece travel?",
        answer:
          "Inside Lagos, by our own dispatch rider. To every other state, by air freight to the nearest hub and then by hand to your address. Either way the parcel is insured for its full value and released only against a signature.",
      },
      {
        question: "You have no rate for my town yet.",
        answer:
          "Order anyway. Checkout will tell you the delivery fee is quoted after you order; we confirm it with the courier and email it to you before anything leaves the building. Nothing is dispatched until you have agreed to that figure.",
      },
    ],
  },
  {
    label: "Payment",
    slug: "payment",
    entries: [
      {
        question: "Which payment methods do you accept?",
        answer:
          "Two. A bank transfer to the house account, or payment on delivery. We do not take cards and we do not run a payment gateway, so nothing about your bank details ever passes through this website.",
      },
      {
        question: "What reference do I use for the transfer?",
        answer:
          "Your order number, exactly as it is written. It is what we match the money against; anything else in the reference field slows your order down while we look for it by hand.",
      },
      {
        question: "When is my piece dispatched?",
        answer:
          "On a transfer, once the money is seen against your order number — usually the same working day. On payment on delivery, once we have confirmed the order with you; the courier collects the full amount at the door before the parcel is handed over.",
      },
    ],
  },
  {
    label: "Returns",
    slug: "returns",
    entries: [
      {
        question: "What is your return policy?",
        answer:
          "Fourteen days from delivery. Unworn, in its original case, with the certificate and everything else it arrived with. Pieces made, sized or altered to order are final — they were built for one person.",
      },
      {
        question: "How do I start a return?",
        answer:
          "Message the concierge with your order number and what is wrong. We arrange insured collection and confirm the return in writing before anything moves, so a piece is never travelling on a guess.",
      },
      {
        question: "How long does a refund take?",
        answer:
          "Once the piece is back with us and inspected, within five working days — to the account the transfer came from, or for a pay-on-delivery order, to an account in your name.",
      },
    ],
  },
  {
    label: "Watches",
    slug: "watches",
    entries: [
      {
        question: "Are your watches authentic?",
        answer:
          "Every watch is verified by serial number and movement inspection before it is listed, and again before it ships.",
      },
      {
        question: "Do you service watches?",
        answer:
          "Yes. Complimentary inspection for life, and a full service at cost with a written estimate first. We do not open a case without telling you what it will cost.",
      },
      {
        question: "Does it come with the box and papers?",
        answer:
          "Whatever a watch ships with is stated on its page — the house case and certificate always, the maker's box and papers where they exist. If something is missing we say so before you buy, not after.",
      },
    ],
  },
  {
    label: "Jewelry",
    slug: "jewelry",
    entries: [
      {
        question: "What metals do you use?",
        answer:
          "14k and 18k gold, platinum, and rhodium-plated sterling silver. The metal is stated on every piece, and it is what it says it is.",
      },
      {
        question: "Can I resize a ring?",
        answer:
          "Once, free, within the first year, on any band that can be sized. Eternity settings and some tension mounts cannot be resized at all — we will tell you which before you order.",
      },
      {
        question: "How do I know my ring size?",
        answer:
          "Ask the concierge for the printable gauge, or send us the inside diameter of a band you already wear. If it still lands wrong, the first resize is on us.",
      },
    ],
  },
  {
    label: "Moissanite",
    slug: "moissanite",
    entries: [
      {
        question: "Is moissanite a real gemstone?",
        answer:
          "Yes. Silicon carbide, first found in a meteorite, now lab-created. It is not a diamond imitation; it is its own stone, with more fire.",
      },
      {
        question: "Will it cloud or fade?",
        answer:
          "No. Moissanite is stable, 9.25 on the Mohs scale, and holds its brilliance for life.",
      },
      {
        question: "Why does it cost less than diamond?",
        answer:
          "Because it is grown in weeks rather than mined over a billion years. It is graded on the same colour and clarity scale, it refracts more light, and every moissanite piece here is sold as moissanite — never passed off as something else.",
      },
    ],
  },
  {
    label: "Warranty",
    slug: "warranty",
    entries: [
      {
        question: "What does the warranty cover?",
        answer:
          "Two years on movements, settings and clasps under normal wear. It does not cover loss, or damage from impact, water beyond the stated resistance, or work done by someone else.",
      },
      {
        question: "How do I make a claim?",
        answer:
          "Send photographs to the concierge with your order number. If it is covered, we collect the piece, repair it and return it at no cost to you.",
      },
      {
        question: "Does the warranty survive a resale?",
        answer:
          "It stays with the piece rather than the person for the full two years. The new owner quotes the original order number and we honour it.",
      },
    ],
  },
  {
    label: "Care",
    slug: "care",
    entries: [
      {
        question: "How should I clean my pieces?",
        answer:
          "Warm water, a drop of mild soap, a soft brush. Dry with the cloth we include. Avoid chlorine and ultrasonic cleaners on set stones.",
      },
      {
        question: "How should I store a watch?",
        answer:
          "In its case, away from magnets and direct sun. Wind automatics weekly if they are not being worn.",
      },
      {
        question: "Can I wear it in water?",
        answer:
          "Read the water resistance on the watch's specification table and treat anything under 100m as splash-proof rather than swim-proof. Take gold and set stones off before the pool or the sea — chlorine and salt dull alloys and loosen settings.",
      },
    ],
  },
] as const;

/** Every answer, in category order. What the FAQ page hands to `faqSchema()`. */
export const FAQ_ENTRIES: readonly FaqQuestion[] = FAQ_CATEGORIES.flatMap(
  (category) => category.entries,
);

export const faqCategoryBySlug = (slug: string): FaqCategory | undefined =>
  FAQ_CATEGORIES.find((category) => category.slug === slug);
