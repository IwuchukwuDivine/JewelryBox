<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="menuOpen" class="menu" role="dialog" aria-modal="true" aria-label="Menu">
        <div class="menu__head">
          <p class="mono-meta">Menu</p>
          <button class="icon-btn" type="button" aria-label="Close menu" @click="closeAll">
            <lucide-x :size="20" :stroke-width="1.4" />
          </button>
        </div>

        <nav class="menu__primary" aria-label="Collections">
          <NuxtLink
            v-for="(collection, index) in COLLECTIONS"
            :key="collection.slug"
            class="menu__row"
            :to="`/${collection.slug}`"
            :style="{ animationDelay: `${index * 80}ms` }"
            @click="closeAll"
          >
            <span class="display-heading menu__label">{{ collection.label }}</span>
            <lucide-arrow-right :size="16" :stroke-width="1.3" />
          </NuxtLink>
        </nav>

        <nav class="menu__secondary" aria-label="More">
          <NuxtLink
            v-for="link in SECONDARY"
            :key="link.to"
            class="menu__link"
            :to="link.to"
            @click="closeAll"
          >
            {{ link.label }}
          </NuxtLink>
        </nav>

        <div class="menu__foot">
          <AppThemeToggle />
          <p class="mono-meta">NGN · EN</p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { COLLECTIONS } from "~/utils/constants/catalog";

const { menuOpen, closeAll } = useOverlays();

const SECONDARY = [
  { label: "About the house", to: "/about" },
  { label: "FAQ", to: "/faq" },
  { label: "Contact", to: "/contact" },
  { label: "Account", to: "/account" },
  { label: "Wishlist", to: "/wishlist" },
  { label: "Track an order", to: "/track" },
] as const;

// Close on route change, and lock the page behind the overlay.
const route = useRoute();
watch(() => route.fullPath, closeAll);

watch(menuOpen, (open) => {
  if (!import.meta.client) return;
  document.body.style.overflow = open ? "hidden" : "";
});

onUnmounted(() => {
  if (import.meta.client) document.body.style.overflow = "";
});
</script>

<style scoped>
.menu {
  position: fixed;
  inset: 0;
  z-index: var(--z-overlay);
  display: flex;
  flex-direction: column;
  padding: 0 20px 32px;
  padding-bottom: calc(32px + var(--bottom));
  overflow-y: auto;
  background: var(--surface);
}

.menu__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  margin-inline: -12px;
  padding-inline: 12px;
}

.menu__primary {
  display: flex;
  flex-direction: column;
}

.menu__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-block: 14px;
  border-bottom: 1px solid var(--border-default);
  color: var(--text-primary);
  text-decoration: none;
  animation: jbRise 0.7s var(--ease-brand) both;
}

.menu__label {
  font-size: clamp(26px, 8vw, 32px);
  line-height: 1.1;
}

.menu__secondary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 16px;
  padding-top: 28px;
}

.menu__link {
  font-size: 14px;
  color: var(--text-secondary);
  text-decoration: none;
}

.menu__link:hover {
  color: var(--text-primary);
}

.menu__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 32px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 400ms var(--ease-brand);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
