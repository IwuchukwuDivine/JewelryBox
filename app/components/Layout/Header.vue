<template>
  <header class="header glass-bar">
    <div class="header__inner">
      <!-- Left: menu, wordmark, then the collections at lg and up. -->
      <div class="header__slot">
        <button
          class="icon-btn header__burger"
          type="button"
          aria-label="Open menu"
          :aria-expanded="menuOpen"
          @click="open('menu')"
        >
          <span class="header__bar header__bar--long" />
          <span class="header__bar header__bar--short" />
        </button>

        <AppLogo class="header__mark" variant="wordmark" to="/" />

        <nav class="header__nav" aria-label="Collections">
          <NuxtLink
            v-for="collection in COLLECTIONS"
            :key="collection.slug"
            class="nav-link"
            :to="`/${collection.slug}`"
          >
            {{ collection.label }}
          </NuxtLink>
        </nav>
      </div>

      <!-- Right: search, account, bag, theme. -->
      <div class="header__slot header__slot--end">
        <button
          class="icon-btn"
          type="button"
          aria-label="Search"
          @click="open('search')"
        >
          <lucide-search :size="17" :stroke-width="1.4" />
        </button>

        <!--
          Always points at /account. `middleware/auth.ts` sends a signed-out
          visitor to /auth/login?redirect=/account and back again afterwards,
          so the destination is correct either way without the href changing
          between server and client — which would be a hydration mismatch,
          since the session is restored after hydration.
        -->
        <NuxtLink class="icon-btn" to="/account" aria-label="Account">
          <lucide-user :size="17" :stroke-width="1.4" />
        </NuxtLink>

        <button
          class="icon-btn header__bag"
          type="button"
          :aria-label="`Bag, ${mounted ? cartCount : 0} items`"
          @click="open('cart')"
        >
          <lucide-shopping-bag :size="17" :stroke-width="1.4" />
          <AppBadge :value="mounted ? cartCount : undefined" />
        </button>

        <AppThemeToggle class="header__theme" />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { COLLECTIONS } from "~/utils/constants/catalog";

const { menuOpen, open } = useOverlays();
const { count: cartCount } = useCart();

// The bag count comes from a persisted store, so it must not render during
// SSR — AppBadge renders nothing for `undefined`, which keeps hydration clean.
const mounted = useMounted();
</script>

<style scoped>
.header {
  position: sticky;
  top: 0;
  z-index: var(--z-header);
  border-bottom: 1px solid var(--border-default);
}

/*
 * Flex with the wordmark in the left cluster rather than a 1fr/auto/1fr grid
 * with it centred — centring left a dead gap between the collections and the
 * mark on wide screens.
 */
.header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  height: 56px;
  max-width: 1280px;
  margin-inline: auto;
  padding-inline: 12px;
}

.header__slot {
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
}

.header__slot--end {
  justify-content: flex-end;
}

.header__mark {
  flex: 0 0 auto;
  /* Sits against the menu button below lg; the icon button already pads it. */
  margin-left: 2px;
}

/* Hamburger — two bars, 20px over 12px, exactly as the prototype draws it. */
.header__burger {
  flex-direction: column;
  gap: 5px;
}

.header__bar {
  display: block;
  height: 1px;
  background: currentColor;
}

.header__bar--long {
  width: 20px;
}

.header__bar--short {
  width: 12px;
}

.header__nav {
  display: none;
  gap: 24px;
}

/* The badge anchor needs a positioning context. */
.header__bag {
  position: relative;
}

@media (min-width: 1024px) {
  .header__inner {
    padding-inline: 32px;
  }

  .header__burger {
    display: none;
  }

  .header__mark {
    margin-left: 0;
    margin-right: 8px;
  }

  .header__nav {
    display: flex;
    padding-left: 16px;
    border-left: 1px solid var(--border-default);
  }
}
</style>
