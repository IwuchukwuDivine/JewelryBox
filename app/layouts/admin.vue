<template>
  <div class="admin">
    <!--
      Desktop: a fixed rail. Seven destinations plus "View store" is more than
      a top bar holds on a laptop without wrapping, which is why BGI's admin
      collapsed to a drawer at 900px and why this one is a sidebar instead.
    -->
    <aside class="admin__rail">
      <NuxtLink to="/admin" class="admin__brand">
        <AppLogo variant="wordmark" size="19px" to="" />
        <span class="admin__tag">Admin</span>
      </NuxtLink>

      <nav class="admin__nav" aria-label="Admin">
        <NuxtLink
          v-for="link in ADMIN_LINKS"
          :key="link.to"
          :to="link.to"
          class="admin__link"
          :class="{ 'admin__link--active': isActive(link.to) }"
        >
          <component :is="link.icon" :size="16" :stroke-width="1.4" />
          <span>{{ link.label }}</span>
        </NuxtLink>
      </nav>

      <div class="admin__rail-foot">
        <NuxtLink to="/" class="admin__link admin__link--muted">
          <Store :size="16" :stroke-width="1.4" />
          <span>View store</span>
        </NuxtLink>
        <AppThemeToggle />
      </div>
    </aside>

    <!-- Mobile: the rail becomes a hamburger and the drawer below. -->
    <header class="admin__bar glass-bar">
      <button
        type="button"
        class="icon-btn"
        aria-label="Open admin menu"
        :aria-expanded="menuOpen"
        @click="menuOpen = true"
      >
        <span class="admin__burger admin__burger--long" />
        <span class="admin__burger admin__burger--short" />
      </button>

      <NuxtLink to="/admin" class="admin__brand admin__brand--bar">
        <AppLogo variant="wordmark" size="17px" to="" />
        <span class="admin__tag">Admin</span>
      </NuxtLink>

      <AppThemeToggle />
    </header>

    <AppSheet v-model="menuOpen" title="Admin" side="left">
      <nav class="admin__drawer-nav" aria-label="Admin">
        <NuxtLink
          v-for="link in ADMIN_LINKS"
          :key="link.to"
          :to="link.to"
          class="admin__link admin__link--drawer"
          :class="{ 'admin__link--active': isActive(link.to) }"
          @click="menuOpen = false"
        >
          <component :is="link.icon" :size="18" :stroke-width="1.4" />
          <span>{{ link.label }}</span>
        </NuxtLink>
      </nav>

      <template #footer>
        <NuxtLink
          to="/"
          class="admin__link admin__link--drawer admin__link--muted"
          @click="menuOpen = false"
        >
          <Store :size="18" :stroke-width="1.4" />
          <span>View store</span>
        </NuxtLink>
      </template>
    </AppSheet>

    <div class="admin__content">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Bell,
  Gem,
  LayoutDashboard,
  Package,
  Settings,
  Store,
  TrendingUp,
  Truck,
} from "lucide-vue-next";

/**
 * The shell every `/admin/*` page sits in.
 *
 * Imported from `lucide-vue-next` rather than used as the auto-imported
 * `<lucide-gem>` tags the storefront uses: these are passed by reference
 * through a `v-for`, and `nuxt-lucide-icons` resolves its components at
 * compile time from the literal tag name, so a dynamic `:is` string would
 * not find them.
 */
const ADMIN_LINKS = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/orders", label: "Orders", icon: Package },
  { to: "/admin/products", label: "Products", icon: Gem },
  { to: "/admin/delivery", label: "Delivery", icon: Truck },
  { to: "/admin/announcements", label: "Announcements", icon: Bell },
  { to: "/admin/analytics", label: "Analytics", icon: TrendingUp },
  { to: "/admin/settings", label: "Settings", icon: Settings },
] as const;

const route = useRoute();
const menuOpen = ref(false);

/**
 * `/admin` has to match exactly — by prefix it would stay lit on every child
 * route and the rail would show two active rows.
 */
const isActive = (to: string) =>
  to === "/admin" ? route.path === "/admin" : route.path.startsWith(to);

// A route change with the drawer open leaves it covering the new page.
watch(() => route.path, () => (menuOpen.value = false));
</script>

<style scoped>
.admin {
  min-height: 100dvh;
  background: var(--surface);
}

/* ── Rail ──────────────────────────────────────────────────────────── */

.admin__rail {
  display: none;
}

.admin__brand {
  display: flex;
  align-items: baseline;
  gap: 7px;
  color: var(--text-primary);
  text-decoration: none;
}

.admin__tag {
  font-family: var(--font-mono);
  font-size: 9px;
  line-height: 1;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--accent);
}

.admin__nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.admin__link {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  padding: 0 12px;
  border-left: 1px solid transparent;
  border-radius: var(--radius-brand);
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  text-decoration: none;
  color: var(--text-muted);
  transition:
    color var(--dur-hover) var(--ease-brand),
    background var(--dur-hover) var(--ease-brand),
    border-color var(--dur-hover) var(--ease-brand);
}

.admin__link:hover {
  color: var(--text-primary);
  background: var(--surface);
}

/* The champagne edge is the only accent in the rail — a filled pill would
   fight the hairline vocabulary the rest of the app is built on. */
.admin__link--active {
  color: var(--text-primary);
  background: var(--surface);
  border-left-color: var(--accent);
}

.admin__link--muted {
  text-transform: none;
  letter-spacing: 0.02em;
  font-size: 12px;
}

.admin__link:focus-visible {
  outline: 2px solid var(--ring-default);
  outline-offset: -2px;
}

.admin__rail-foot {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid var(--border-default);
}

/* ── Mobile bar ────────────────────────────────────────────────────── */

.admin__bar {
  position: sticky;
  top: 0;
  z-index: var(--z-header);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: calc(10px + var(--top)) 16px 10px;
  border-bottom: 1px solid var(--border-default);
}

.admin__brand--bar {
  margin-right: auto;
}

.admin__burger {
  display: block;
  height: 1px;
  background: currentColor;
  transition: width var(--dur-hover) var(--ease-brand);
}

.admin__burger--long {
  width: 17px;
  margin-bottom: 5px;
}

.admin__burger--short {
  width: 11px;
}

.icon-btn:hover .admin__burger--short {
  width: 17px;
}

.admin__drawer-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.admin__link--drawer {
  min-height: 48px;
  font-size: 13px;
}

/* ── Content ───────────────────────────────────────────────────────── */

/*
  `app.vue` already wraps the page in <main id="main-content">, so the slot's
  only child is that element — hence `:slotted`, the same shape `default.vue`
  uses. A second <main> here would nest one inside the other.
*/
.admin__content > :slotted(*) {
  display: block;
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 24px 20px 64px;
}

@media (min-width: 900px) {
  .admin {
    display: grid;
    grid-template-columns: 244px 1fr;
  }

  .admin__rail {
    position: sticky;
    top: 0;
    display: flex;
    flex-direction: column;
    gap: 24px;
    height: 100dvh;
    padding: 24px 16px;
    padding-top: calc(24px + var(--top));
    border-right: 1px solid var(--border-default);
    background: var(--surface-muted);
  }

  .admin__bar {
    display: none;
  }

  .admin__content > :slotted(*) {
    padding: 36px 32px 80px;
  }
}
</style>
