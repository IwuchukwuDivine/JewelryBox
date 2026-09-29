<template>
  <Teleport to="body">
    <Transition name="search">
      <div v-if="searchOpen" class="search-overlay">
        <div
          ref="panel"
          class="search-overlay__panel"
          role="dialog"
          aria-modal="true"
          aria-label="Search the collection"
          tabindex="-1"
        >
          <ShopSearchPanel
            v-model="query"
            autofocus
            dismissible
            @close="close"
            @navigate="close"
          />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * The header's search overlay.
 *
 * Driven by `useOverlays().searchOpen`, which the header already toggles.
 * Everything inside is `ShopSearchPanel` — the same component the `/search`
 * route renders, so the two surfaces can never disagree.
 *
 * Full-bleed rather than a drawer: the prototype fills the frame with the
 * house surface and fades it in, because search replaces the page rather
 * than sitting over it.
 */
const { searchOpen, closeAll } = useOverlays();

const query = ref("");
const panel = ref<HTMLElement | null>(null);

const close = () => {
  closeAll();
};

/* ── Scroll lock, Escape and focus restoration ────────────────────────── */
let previouslyFocused: HTMLElement | null = null;
let priorOverflow = "";

const onKeydown = (event: KeyboardEvent) => {
  if (event.key !== "Escape") return;
  event.preventDefault();
  close();
};

const activate = async () => {
  previouslyFocused = document.activeElement as HTMLElement | null;
  priorOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  document.addEventListener("keydown", onKeydown);
  await nextTick();

  const el = panel.value;
  if (!el) return;
  /* AppSearchBar autofocuses itself — do not pull focus back off the field. */
  if (el.contains(document.activeElement)) return;
  (el.querySelector<HTMLInputElement>("input") ?? el).focus();
};

const release = () => {
  document.removeEventListener("keydown", onKeydown);
  document.body.style.overflow = priorOverflow;
  const target = previouslyFocused;
  previouslyFocused = null;
  target?.focus?.();
};

watch(searchOpen, (open) => {
  if (open) {
    void activate();
    return;
  }
  release();
  /* Leaving the query behind would show stale results on the next open. */
  query.value = "";
});

onUnmounted(release);
</script>

<style scoped>
.search-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-overlay);
  display: flex;
  justify-content: center;
  background: var(--surface);
}

.search-overlay__panel {
  width: 100%;
  max-width: 720px;
  height: 100%;
  overflow-y: auto;
  padding: 0 20px calc(32px + var(--bottom));
  outline: none;
}

.search-enter-active,
.search-leave-active {
  transition: opacity var(--dur-hover) var(--ease-brand);
}

.search-enter-from,
.search-leave-to {
  opacity: 0;
}

@media (min-width: 768px) {
  .search-overlay__panel {
    padding-inline: 32px;
  }
}
</style>
