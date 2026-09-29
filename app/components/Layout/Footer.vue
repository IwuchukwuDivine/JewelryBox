<template>
  <footer class="footer">
    <AppContainer>
      <div class="footer__top">
        <AppLogo variant="monogram" size="36px" :to="undefined" />
        <p class="mono-meta footer__place">
          {{ SITE_DOMAIN.toUpperCase() }}<br >LAGOS · {{ year }}<br >
          <a
            class="footer__social"
            :href="INSTAGRAM_URL"
            target="_blank"
            rel="noopener"
          >@{{ INSTAGRAM_HANDLE }}</a>
        </p>
      </div>

      <div class="footer__grid">
        <nav v-for="column in COLUMNS" :key="column.title" class="footer__column">
          <h2 class="caption footer__title">{{ column.title }}</h2>
          <ul class="footer__list">
            <li v-for="link in column.links" :key="link.to">
              <NuxtLink class="footer__link" :to="link.to">{{ link.label }}</NuxtLink>
            </li>
          </ul>
        </nav>
      </div>

      <div class="footer__bar">
        <p class="footer__legal">© {{ year }} {{ SITE_NAME }}.ng</p>
        <p class="footer__legal">Bank transfer · Pay on delivery</p>
      </div>
    </AppContainer>
  </footer>
</template>

<script setup lang="ts">
import { SITE_DOMAIN, SITE_NAME } from "~/utils/constants/brand";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "~/utils/constants/contact";

const year = new Date().getFullYear();

/**
 * Four columns, from the prototype. The payment badges it showed
 * (Paystack, Flutterwave) are gone — this house takes bank transfer
 * and pay on delivery only.
 */
const COLUMNS = [
  {
    title: "Shop",
    links: [
      { label: "Watches", to: "/watches" },
      { label: "Jewelry", to: "/jewelry" },
      { label: "Moissanite", to: "/moissanite" },
      { label: "Gifts", to: "/gifts" },
    ],
  },
  {
    title: "Client care",
    links: [
      { label: "FAQ", to: "/faq" },
      { label: "Shipping & Returns", to: "/shipping-returns" },
      { label: "Track an order", to: "/track" },
      { label: "Contact", to: "/contact" },
    ],
  },
  {
    title: "House",
    links: [
      { label: "About", to: "/about" },
      { label: "Privacy", to: "/privacy" },
      { label: "Terms", to: "/terms" },
    ],
  },
  {
    title: "You",
    links: [
      { label: "Account", to: "/account" },
      { label: "Orders", to: "/account?tab=orders" },
      { label: "Wishlist", to: "/wishlist" },
    ],
  },
] as const;
</script>

<style scoped>
.footer {
  margin-top: 72px;
  padding-block: 40px 36px;
  border-top: 1px solid var(--border-default);
}

.footer__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 32px;
}

.footer__place {
  text-align: right;
  line-height: 1.7;
}

.footer__social {
  color: var(--text-secondary);
  text-decoration: none;
  transition: color var(--dur-hover) var(--ease-brand);
}

.footer__social:hover {
  color: var(--text-primary);
}

.footer__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px 16px;
}

.footer__title {
  margin: 0 0 10px;
}

.footer__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.footer__link {
  display: inline-block;
  padding-block: 3px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-secondary);
  text-decoration: none;
  transition: color var(--dur-hover) var(--ease-brand);
}

.footer__link:hover {
  color: var(--text-primary);
}

.footer__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px solid var(--border-default);
}

.footer__legal {
  margin: 0;
  font-size: 11px;
  color: var(--text-muted);
}

@media (min-width: 768px) {
  .footer__grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>
