<template>
  <AppContainer as="main" narrow class="legal">
    <ContentPageHeader
      eyebrow="The House"
      title="Privacy"
      lede="What we ask you for, why we need it, and what we will not do with it."
      :updated="UPDATED"
    />

    <ContentProse>
      <section>
        <h2>The short version</h2>
        <p>
          We ask for the least we need to get a piece to you and to answer you
          when you write. We never see your card or your bank login, because we
          do not take card payments at all. We do not sell your details to
          anybody, and we do not add you to a mailing list you did not ask for.
        </p>
      </section>

      <section>
        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>To fulfil an order:</strong> your name, phone number, email
            address and delivery address, and what you ordered.
          </li>
          <li>
            <strong>If you create an account:</strong> the same, plus your order
            history and any addresses you save for next time.
          </li>
          <li>
            <strong>If you write to us:</strong> your name, your email address
            and what you wrote — by form, email or WhatsApp.
          </li>
          <li>
            <strong>Automatically:</strong> the technical information any website
            receives — the pages you opened, roughly where in the world the
            request came from, your browser and device type. Your bag and your
            wishlist are kept in your own browser, not on our servers, until you
            sign in.
          </li>
        </ul>
      </section>

      <section>
        <h2>What we do not collect</h2>
        <p>
          Card numbers, CVVs and bank passwords. Payment is by transfer from
          your own banking app, or in cash or transfer to the courier on
          delivery, so there is no card form on this site for anyone to
          intercept. If a page ever asks you for card details, it is not us.
        </p>
      </section>

      <section>
        <h2>Why we hold it</h2>
        <ul>
          <li>To confirm your order and match your transfer to it.</li>
          <li>To have the piece delivered to the right person at the right address.</li>
          <li>To answer your questions, and to honour a warranty or a return.</li>
          <li>To keep the business records any retailer has to keep.</li>
          <li>
            To understand, in aggregate, which pages are useful — and only where
            you have agreed to measurement.
          </li>
        </ul>
      </section>

      <section>
        <h2>Who else sees it</h2>
        <p>
          Only the parties who have to, and only the part they need:
        </p>
        <ul>
          <li>
            <strong>The courier or dispatch rider</strong> — your name, address
            and phone number, so they can reach you.
          </li>
          <li>
            <strong>Our bank</strong> — sees your transfer the way it sees any
            transfer. We see the amount, the reference and the sender name.
          </li>
          <li>
            <strong>The companies that host and run this site</strong> — hosting,
            email and database providers, which process data on our instruction
            and for no purpose of their own.
          </li>
        </ul>
        <p>
          We do not sell, rent or trade your details, and we do not pass them to
          anyone for their own marketing.
        </p>
      </section>

      <section>
        <h2>Cookies and measurement</h2>
        <p>
          The site needs a small amount of local storage to work at all — to
          remember your bag, your saved pieces and whether you asked for the
          light or the dark theme. That much is not optional and carries nothing
          about you personally.
        </p>
        <p>
          Anything beyond that — analytics that tell us which pages are read —
          runs only if you accept it in the banner. You can decline and the shop
          works exactly the same. You can change your mind later by clearing
          this site's data in your browser.
        </p>
      </section>

      <section>
        <h2>How long we keep it</h2>
        <p>
          Order records stay for as long as we may need them for warranty,
          returns and accounting. Messages are kept while a conversation is
          live and for a reasonable period afterwards, in case you come back to
          it. An account you ask us to close is closed, and what is left is
          only what the order records require.
        </p>
      </section>

      <section>
        <h2>Keeping it safe</h2>
        <p>
          The site is served over HTTPS, access to customer data is limited to
          the people who need it to do their job, and our database enforces that
          you can only read your own rows. No one can promise perfect security;
          what we can promise is that we do not hold what we do not need.
        </p>
      </section>

      <section>
        <h2>Your choices</h2>
        <p>
          Write to us and we will tell you what we hold about you, correct
          anything wrong, or delete what we are not obliged to keep. We will
          answer within a reasonable time and we will not make it difficult. If
          Nigerian data protection law gives you a right that is not described
          here, it still applies.
        </p>
      </section>

      <section>
        <h2>Children</h2>
        <p>
          This shop is meant for adults. We do not knowingly collect information
          from anyone under eighteen; if you believe we have, tell us and we will
          remove it.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          If this policy changes we will change the date at the top of the page.
          If a change materially affects what we do with information we already
          hold, we will say so rather than leave you to find it.
        </p>
      </section>
    </ContentProse>

    <ContentCallout
      text="A question about your information, or a request about it?"
      action-label="Contact"
      to="/contact"
    />
  </AppContainer>
</template>

<script setup lang="ts">
/**
 * Plain-language privacy notice.
 *
 * Deliberately non-committal where the answer is not yet knowable: no company
 * registration number, no processor list by name, no statutory citations, no
 * retention period stated in months. Everything asserted here is something the
 * build actually does.
 */
const UPDATED = "28 September 2026";

usePageSeo({
  title: "Privacy",
  description:
    "What JewelryBox collects, why, and who else sees it. No card details are taken on this site, and nothing is sold on.",
  path: "/privacy",
  ogType: "article",
  jsonLd: breadcrumbSchema([{ name: "Privacy", path: "/privacy" }]),
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
