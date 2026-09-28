<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="modelValue" class="sheet">
        <div class="sheet__backdrop" @click="close" />

        <aside
          ref="panelRef"
          class="sheet__panel"
          :class="`sheet__panel--${side}`"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="labelledBy ?? titleId"
          tabindex="-1"
        >
          <span v-if="side === 'bottom'" class="sheet__grip" aria-hidden="true" />

          <slot name="header">
            <header class="sheet__header">
              <span :id="titleId" class="mono-meta sheet__title">{{ title }}</span>

              <button
                type="button"
                class="icon-btn sheet__close"
                aria-label="Close"
                @click="close"
              >
                <lucide-x :size="18" :stroke-width="1.5" />
              </button>
            </header>
          </slot>

          <div class="sheet__body">
            <slot />
          </div>

          <footer v-if="$slots.footer" class="sheet__footer">
            <slot name="footer" />
          </footer>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * The drawer. The cart drawer and the mobile filter tray are both this.
 *
 * Left and right slide in over `--dur-reveal` (600ms) on `--ease-brand`; the
 * bottom variant rises on `jbSheet` and carries the prototype's 36 × 2 grip.
 * Scrim is `--overlay-scrim` at `jbFade`.
 */
const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    title: string;
    side?: "left" | "right" | "bottom";
    labelledBy?: string;
  }>(),
  { side: "right" },
);

const emit = defineEmits<{ "update:modelValue": [open: boolean] }>();

const titleId = `jb-sheet-${useId()}`;
const panelRef = ref<HTMLElement | null>(null);

const close = () => emit("update:modelValue", false);

/* ── Focus trap ────────────────────────────────────────────────────────── */
const FOCUSABLE = [
  "a[href]",
  "area[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "button:not([disabled])",
  "iframe",
  "object",
  "embed",
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(",");

const focusables = () => {
  const panel = panelRef.value;
  if (!panel) return [];
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.getClientRects().length > 0,
  );
};

const trapTab = (event: KeyboardEvent) => {
  const panel = panelRef.value;
  if (!panel) return;

  const items = focusables();
  const first = items[0];
  const last = items[items.length - 1];

  if (!first || !last) {
    event.preventDefault();
    panel.focus();
    return;
  }

  const active = document.activeElement as HTMLElement | null;
  const inside = active ? panel.contains(active) : false;

  if (event.shiftKey && (!inside || active === first)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (!inside || active === last)) {
    event.preventDefault();
    first.focus();
  }
};

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === "Escape") {
    event.preventDefault();
    close();
    return;
  }
  if (event.key === "Tab") trapTab(event);
};

/* ── Scroll lock + focus restoration ──────────────────────────────────── */
let previouslyFocused: HTMLElement | null = null;
let priorOverflow = "";
let active = false;

const activate = async () => {
  if (active) return;
  active = true;

  previouslyFocused = document.activeElement as HTMLElement | null;
  priorOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  document.addEventListener("keydown", onKeydown);

  await nextTick();
  const items = focusables();
  (items[0] ?? panelRef.value)?.focus();
};

const release = () => {
  if (!active) return;
  active = false;

  document.removeEventListener("keydown", onKeydown);
  document.body.style.overflow = priorOverflow;

  const target = previouslyFocused;
  previouslyFocused = null;
  target?.focus?.();
};

onMounted(() => {
  if (props.modelValue) void activate();
});

watch(
  () => props.modelValue,
  (open) => {
    if (open) void activate();
    else release();
  },
);

onUnmounted(release);
</script>

<style scoped>
.sheet {
  position: fixed;
  inset: 0;
  z-index: var(--z-overlay);
}

.sheet__backdrop {
  position: absolute;
  inset: 0;
  border: none;
  background: var(--overlay-scrim);
  animation: jbFade 400ms var(--ease-brand) backwards;
  cursor: pointer;
}

.sheet__panel {
  position: absolute;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  color: var(--text-primary);
  outline: none;
}

/* ── Right · the cart drawer ──────────────────────────────────────────── */
.sheet__panel--right {
  top: 0;
  right: 0;
  bottom: 0;
  width: min(420px, 100vw - 40px);
  padding-right: var(--right);
  padding-bottom: var(--bottom);
  border-left: 1px solid var(--border-default);
  animation: jbSlideIn var(--dur-reveal) var(--ease-brand) backwards;
}

/* ── Left · mirrored. jbSlideIn only travels one way, so the mirror lives
      here rather than in main.css. ────────────────────────────────────── */
.sheet__panel--left {
  top: 0;
  left: 0;
  bottom: 0;
  width: min(420px, 100vw - 40px);
  padding-left: var(--left);
  padding-bottom: var(--bottom);
  border-right: 1px solid var(--border-default);
  animation: jbSlideInLeft var(--dur-reveal) var(--ease-brand) backwards;
}


/* ── Bottom · the quick-view tray ─────────────────────────────────────── */
.sheet__panel--bottom {
  left: 0;
  right: 0;
  bottom: 0;
  max-height: 85dvh;
  padding-left: var(--left);
  padding-right: var(--right);
  padding-bottom: var(--bottom);
  border-top: 1px solid var(--border-default);
  animation: jbSheet var(--dur-reveal) var(--ease-brand) backwards;
}

.sheet__grip {
  display: block;
  flex: 0 0 auto;
  width: 36px;
  height: 2px;
  margin: 10px auto 0;
  background: var(--border-default);
}

.sheet__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex: 0 0 auto;
  height: 56px;
  padding: 0 20px;
  border-bottom: 1px solid var(--border-default);
}

.sheet__title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sheet__close {
  flex: 0 0 auto;
  margin-right: -12px;
  color: var(--text-primary);
}

.sheet__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px;
}

.sheet__footer {
  flex: 0 0 auto;
  padding: 16px 20px 24px;
  border-top: 1px solid var(--border-default);
  background: var(--surface-muted);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--dur-hover) var(--ease-brand);
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
