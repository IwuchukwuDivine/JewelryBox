<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="modelValue" class="modal">
        <div class="modal__backdrop" @click="onScrimIntent" />

        <div
          ref="panelRef"
          class="modal__panel luxe-card"
          :class="`modal__panel--${size}`"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="hasTitle ? titleId : undefined"
          :aria-label="hasTitle ? undefined : 'Dialog'"
          tabindex="-1"
        >
          <header class="modal__header">
            <h2 :id="titleId" class="modal__title display-heading">
              <slot name="title">{{ title }}</slot>
            </h2>

            <button
              v-if="dismissible"
              type="button"
              class="icon-btn modal__close"
              aria-label="Close"
              @click="close('close-button')"
            >
              <lucide-x :size="18" :stroke-width="1.5" />
            </button>
          </header>

          <div class="modal__body">
            <slot />
          </div>

          <footer v-if="$slots.actions" class="modal__actions">
            <slot name="actions" :close="closeFromAction" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * Centred dialog.
 *
 * Teleported to <body> so no page stacking context can trap it. The scrim is
 * `--overlay-scrim` (40%, per Brand Identity §07) and the panel is a
 * `.luxe-card`. `persistent` refuses the backdrop and Escape and answers with
 * one brief 1.04 → 1 settle instead of closing.
 */
type CloseReason = "backdrop" | "escape" | "close-button" | "action";

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    title?: string;
    size?: "sm" | "md" | "lg";
    dismissible?: boolean;
    persistent?: boolean;
  }>(),
  { size: "md", dismissible: true, persistent: false },
);

const emit = defineEmits<{
  "update:modelValue": [open: boolean];
  close: [reason: CloseReason];
}>();

const slots = useSlots();

const titleId = `jb-modal-${useId()}`;
const hasTitle = computed(() => Boolean(props.title) || Boolean(slots.title));

const panelRef = ref<HTMLElement | null>(null);

/** The backdrop and Escape only close a dismissible, non-persistent dialog. */
const canDismiss = computed(() => props.dismissible && !props.persistent);

const close = (reason: CloseReason) => {
  emit("update:modelValue", false);
  emit("close", reason);
};

const closeFromAction = () => close("action");

/* ── The "no" gesture ──────────────────────────────────────────────────
   A persistent dialog acknowledges the tap with the house settle instead
   of an error. Driven through classList + a forced reflow so a second tap
   restarts the keyframe rather than coalescing into no change at all. */
let pulseTimer: ReturnType<typeof setTimeout> | undefined;

const pulse = () => {
  const el = panelRef.value;
  if (!el) return;
  el.classList.remove("modal__panel--pulse");
  void el.offsetWidth;
  el.classList.add("modal__panel--pulse");
  clearTimeout(pulseTimer);
  pulseTimer = setTimeout(
    () => el.classList.remove("modal__panel--pulse"),
    280,
  );
};

const onScrimIntent = () => {
  if (props.persistent) return pulse();
  if (!props.dismissible) return;
  close("backdrop");
};

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
    if (props.persistent) {
      event.preventDefault();
      pulse();
      return;
    }
    if (!canDismiss.value) return;
    event.preventDefault();
    close("escape");
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
  /* Restore what was there, not a blank string — another overlay may own it. */
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

onUnmounted(() => {
  clearTimeout(pulseTimer);
  release();
});
</script>

<style scoped>
.modal {
  position: fixed;
  inset: 0;
  z-index: var(--z-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(20px + var(--top)) calc(20px + var(--right))
    calc(20px + var(--bottom)) calc(20px + var(--left));
}

.modal__backdrop {
  position: absolute;
  inset: 0;
  border: none;
  background: var(--overlay-scrim);
  animation: jbFade var(--dur-hover) var(--ease-brand) backwards;
  cursor: pointer;
}

.modal__panel {
  position: relative;
  display: flex;
  flex-direction: column;
  max-height: 100%;
  animation: jbRise var(--dur-reveal) var(--ease-brand) backwards;
  outline: none;
}

.modal__panel--pulse {
  animation: jbScale var(--dur-hover) var(--ease-brand);
}

.modal__panel--sm {
  width: min(320px, 100%);
}
.modal__panel--md {
  width: min(420px, 100%);
}
.modal__panel--lg {
  width: min(560px, 100%);
}

.modal__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 20px 0;
}

.modal__title {
  margin: 0;
  font-size: 22px;
  line-height: 1.2;
  padding-top: 4px;
}

.modal__title:empty {
  display: none;
}

.modal__close {
  flex: 0 0 auto;
  margin: -10px -10px 0 0;
}

.modal__body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px 20px;
  font-size: 14px;
  line-height: 1.55;
  color: var(--text-secondary);
}

.modal__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 20px 20px;
  border-top: 1px solid var(--border-default);
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
