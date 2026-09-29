<template>
  <AppContainer as="main" narrow class="legal">
    <ContentPageHeader
      eyebrow="The House"
      title="Terms"
      lede="The agreement between you and the house when you buy a piece from us."
      :updated="UPDATED"
    />

    <ContentProse>
      <section>
        <h2>Who you are dealing with</h2>
        <p>
          JewelryBox is a jewelry and watch retailer operating from Lekki, Lagos,
          Nigeria, trading at jewelrybox.ng. &ldquo;We&rdquo; and
          &ldquo;the house&rdquo; mean JewelryBox; &ldquo;you&rdquo; means the
          person buying or browsing.
        </p>
      </section>

      <section>
        <h2>Using this site</h2>
        <p>
          You may browse, save pieces and order for your own use. Please do not
          copy our photography or text for your own listings, scrape the
          catalogue, or try to interfere with how the site runs. We may withdraw
          access if any of that happens.
        </p>
      </section>

      <section>
        <h2>Prices</h2>
        <p>
          Every price is in Nigerian naira and includes any tax that applies.
          Delivery is charged separately and is shown before you commit.
        </p>
        <p>
          Prices can change, and a piece in your bag is not held at the price it
          was when you added it. Whatever a piece costs at the moment you place
          the order is what we charge for it — we reprice every line from our own
          records at that moment, so nothing that happens in your browser can
          change what you pay, in either direction.
        </p>
        <p>
          If a price is obviously wrong — a decimal in the wrong place, a stone
          priced as a pebble — we will tell you before dispatch and give you the
          choice of paying the correct price or cancelling for a full refund. We
          will not quietly charge you more.
        </p>
      </section>

      <section>
        <h2>Placing an order</h2>
        <p>
          Your order is an offer to buy. Our confirmation email acknowledges that
          we received it; the contract is made when we accept it and dispatch the
          piece. We may decline an order — for example if a piece has just sold,
          if we cannot verify the delivery address, or if we cannot reach you —
          and if you have already paid, we refund in full.
        </p>
      </section>

      <section>
        <h2>Payment</h2>
        <p>
          Two methods: a bank transfer to the house account, or payment on
          delivery. There are no card payments and no payment gateway.
        </p>
        <p>
          For a transfer, your order number is the reference. For payment on
          delivery, the courier collects the full amount before handing the
          parcel over. Until a piece is paid for in full it remains ours, even
          once it is on its way to you. An order awaiting a transfer is held for
          a reasonable time and then released back to the catalogue — we will
          tell you before that happens.
        </p>
      </section>

      <section>
        <h2>Availability and made-to-order pieces</h2>
        <p>
          Stock is real but it moves, and two people can reach the same piece at
          the same moment. If what you ordered has gone, we will tell you at once
          and either hold the next one for you or refund you in full.
        </p>
        <p>
          A piece marked made to order is built after you order it. Its lead time
          is shown on its page, and once work has begun it cannot be cancelled or
          returned.
        </p>
      </section>

      <section>
        <h2>Delivery, returns and refunds</h2>
        <p>
          These are set out in full on the
          <NuxtLink to="/shipping-returns">Shipping &amp; Returns</NuxtLink>
          page, which forms part of these terms: how a piece travels, what
          delivery costs, the fourteen-day return window, and what cannot be
          returned.
        </p>
      </section>

      <section>
        <h2>What we say about a piece</h2>
        <p>
          Specifications, metals, stone weights and water resistance are stated
          accurately, and where a piece carries a certificate it says exactly
          what is inside. Moissanite is always sold as moissanite and never
          described as diamond.
        </p>
        <p>
          Photography is honest but it is still photography: screens differ, and
          gold in daylight is not gold under a lamp. A small difference in shade
          is not a fault. Anything that is genuinely not as described is our
          problem to fix, and the return window is there for exactly that.
        </p>
      </section>

      <section>
        <h2>Warranty</h2>
        <p>
          Two years on movements, settings and clasps under normal wear, from the
          date of delivery. It does not cover loss, damage from impact, water
          beyond a piece's stated resistance, ordinary wear to plating and
          straps, or work done by anyone other than us. Watches also carry
          complimentary inspection for life; a full service is charged at cost,
          always with a written estimate first.
        </p>
      </section>

      <section>
        <h2>Accounts</h2>
        <p>
          An account is optional — you can order without one. If you have one,
          keep your sign-in details to yourself and tell us if you think someone
          else has them. You can ask us to close it at any time.
        </p>
      </section>

      <section>
        <h2>Our responsibility</h2>
        <p>
          We are responsible for getting the piece you ordered to you, as
          described, insured on the way. We are not responsible for losses that
          have nothing to do with the piece itself — a missed occasion, a courier
          strike, a bank outage, or anything else outside our reasonable control
          — and nothing here limits a responsibility that cannot lawfully be
          limited.
        </p>
      </section>

      <section>
        <h2>Changes to these terms</h2>
        <p>
          We may update this page; the date at the top says when it last changed.
          The version that applies to your order is the one in force on the day
          you placed it.
        </p>
      </section>

      <section>
        <h2>Law</h2>
        <p>
          These terms are governed by the laws of the Federal Republic of
          Nigeria. If something goes wrong, write to us first — nearly everything
          is settled faster in a conversation than anywhere else.
        </p>
      </section>
    </ContentProse>

    <ContentCallout
      text="Anything here you would like explained before you order?"
      action-label="Contact"
      to="/contact"
    />
  </AppContainer>
</template>

<script setup lang="ts">
/**
 * Terms of sale, in plain language.
 *
 * No company registration number, no street address beyond Lekki, Lagos, and
 * no statutory citations — none of those are knowable from here. Every claim
 * made below matches how the build actually behaves (`place_order` reprices
 * lines; payment is transfer or on delivery; made-to-order is final).
 */
const UPDATED = "28 September 2026";

usePageSeo({
  title: "Terms",
  description:
    "The terms of sale between you and JewelryBox: prices in naira, payment by transfer or on delivery, and what our warranty covers.",
  path: "/terms",
  ogType: "article",
  jsonLd: breadcrumbSchema([{ name: "Terms", path: "/terms" }]),
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
