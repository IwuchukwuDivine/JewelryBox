<template>
  <AppContainer as="main" narrow class="legal">
    <ContentPageHeader
      eyebrow="Client care"
      title="Shipping & Returns"
      lede="How a piece reaches you, what it costs to get there, and what happens if it is not right."
      :updated="UPDATED"
    />

    <ContentProse>
      <section>
        <h2>How your order travels</h2>
        <p>
          Inside Lagos, a piece goes out with our own dispatch rider and
          normally reaches you in <strong>1–2 working days</strong>. To every
          other state it travels by air freight to the nearest hub and is then
          taken to your address by hand, normally in
          <strong>2–4 working days</strong>.
        </p>
        <p>
          You do not choose between the two. We read the destination from your
          delivery address and send it the only way that makes sense for it.
          Every parcel is insured for the full value of what is inside and is
          released only against a signature.
        </p>
      </section>

      <section>
        <h2>What delivery costs</h2>
        <p>
          Delivery is charged at what it costs us to move the piece safely.
          Lagos is priced per area and every other state per route, so there is
          no flat fee: the exact figure appears at checkout as soon as you give
          the address, before you commit to anything.
        </p>
        <p>
          If we do not have a rate on file for your destination yet, checkout
          will say so and you can still place the order. We confirm the cost
          with the courier and email it to you.
          <strong>
            Nothing is dispatched until you have seen that figure and agreed to
            it.
          </strong>
        </p>
      </section>

      <section>
        <h2>Paying for your order</h2>
        <p>
          There are two ways to pay: a bank transfer to the house account, or
          payment on delivery. We do not take card payments and we do not run a
          payment gateway.
        </p>
        <p>
          For a transfer, <strong>your order number is the reference</strong> —
          it looks like JB-XXXXXX and appears on the confirmation screen and in
          your confirmation email. Use it exactly as written; anything else in
          the reference field means we have to find your payment by hand, and
          that delays your piece. We dispatch once the money is seen against
          your order number, usually the same working day.
        </p>
        <p>
          For payment on delivery, the courier collects the full amount at the
          door before the parcel is handed over.
        </p>
      </section>

      <section>
        <h2>Before it leaves us</h2>
        <p>
          Every piece is inspected, sealed in its case with its certificate and
          the cloth, and photographed as it is packed. Watches are checked a
          second time against their serial number. The parcel itself carries
          nothing on the outside that says what is inside it.
        </p>
      </section>

      <section>
        <h2>Receiving your order</h2>
        <p>
          Someone over eighteen has to be there to sign. If that cannot be you,
          tell us who it will be when you order and we will note it — a courier
          will not leave a parcel like this at a gate, with a neighbour, or with
          security.
        </p>
        <p>
          Open the case while the courier is still with you. If the seal is
          broken or something is missing, do not sign for it: refuse the parcel
          and call us straight away. A signature is our record that the piece
          arrived intact.
        </p>
      </section>

      <section>
        <h2>If something is wrong on arrival</h2>
        <p>
          Message the concierge within <strong>24 hours</strong> with your order
          number and photographs of what you received, including the case and
          the seal. Insurance covers a piece damaged or lost in transit, and we
          replace or refund it rather than asking you to argue with a courier.
        </p>
      </section>

      <section>
        <h2>Returns</h2>
        <p>
          You have <strong>fourteen days from delivery</strong> to change your
          mind. The piece must come back unworn, in its original case, with the
          certificate and everything else it arrived with.
        </p>
        <p>We cannot take back:</p>
        <ul>
          <li>
            pieces made, sized, engraved or otherwise altered to order — they
            were built for one person
          </li>
          <li>anything worn, scratched, resized elsewhere or serviced elsewhere</li>
          <li>a piece returned without its certificate or its case</li>
          <li>earrings that have been worn, for reasons of hygiene</li>
        </ul>
      </section>

      <section>
        <h2>How to start a return</h2>
        <p>
          Message the concierge with your order number and what is wrong. We
          arrange insured collection and confirm the return in writing before
          anything moves, so a piece is never travelling on a guess. Please do
          not post a piece back to us on your own — an uninsured parcel is a
          risk neither of us needs to take.
        </p>
      </section>

      <section>
        <h2>Refunds</h2>
        <p>
          Once the piece is back with us and inspected, we refund within
          <strong>five working days</strong> — to the account the transfer came
          from, or for a pay-on-delivery order, to an account in your name. The
          delivery fee is refunded when the return is our fault, and retained
          when it is a change of mind.
        </p>
      </section>

      <section>
        <h2>Resizing and repairs</h2>
        <p>
          A ring that can be sized is resized once, free, within the first year.
          Eternity settings and some tension mounts cannot be resized at all,
          and we say so before you order. Warranty repairs — two years on
          movements, settings and clasps under normal wear — are collected,
          repaired and returned at no cost to you.
        </p>
      </section>
    </ContentProse>

    <ContentCallout
      text="Something about your delivery you cannot find here?"
      action-label="Contact"
      to="/contact"
    />
  </AppContainer>
</template>

<script setup lang="ts">
/**
 * The delivery and returns promise, written out in full.
 *
 * This page and app/utils/constants/faq.ts have to agree — the FAQ is the
 * short version of exactly these rules. Change one, change both.
 */
const UPDATED = "28 September 2026";

usePageSeo({
  title: "Shipping & Returns",
  description:
    "Lagos in 1–2 working days by dispatch rider, other states in 2–4 by air freight. Insured, signed for, and fourteen days to change your mind.",
  path: "/shipping-returns",
  ogType: "article",
  jsonLd: breadcrumbSchema([
    { name: "Shipping & Returns", path: "/shipping-returns" },
  ]),
});
</script>

<style scoped>
.legal {
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding-block: 24px 64px;
}
</style>
