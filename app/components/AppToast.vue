<template>
  <div class="toast-stack" role="status" aria-live="polite">
    <transition-group id="alert-sequence" name="alert" tag="ul">
      <li
        v-for="(notification, index) in toasts"
        :key="notification.id"
        class="toast"
        :class="stackClass(index)"
      >
        <span
          class="toast__accent"
          :style="{ background: STATUS_COLORS[notification.type] }"
          aria-hidden="true"
        />

        <p class="toast__text">{{ notification.notification }}</p>

        <button
          type="button"
          class="toast__close"
          aria-label="Dismiss"
          @click="removeToast(notification.id)"
        >
          <lucide-x :size="14" :stroke-width="1.5" />
        </button>
      </li>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { STATUS_COLORS } from "~/utils/constants/appData";

/**
 * Toasts. One card, one look: ink ground, paper type, entering on `jbRise` at
 * `top: 68px` — clear of the header. The four types are carried by the 2px
 * accent bar alone rather than by four different backgrounds, which is what
 * the old Tailwind palettes did.
 */
const { removeToast, toasts } = useApp();

/* Three cards deep, each one behind the last. Anything further is parked
   off-stage; the store never holds more than three anyway. */
const stackClass = (index: number) =>
  index < 3 ? `toast--depth-${index}` : "toast--depth-out";
</script>

<style scoped>
.toast-stack {
  position: fixed;
  top: calc(68px + var(--top));
  left: 50%;
  z-index: var(--z-toast);
  width: min(400px, calc(100vw - 40px));
  transform: translateX(-50%);
  pointer-events: none;
}

#alert-sequence {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 0;
  padding: 0;
  list-style: none;
}

.toast {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  border-radius: var(--radius-brand);
  background: var(--text-primary);
  color: var(--surface);
  box-shadow: 0 8px 32px var(--overlay-scrim);
  pointer-events: auto;
  transform-origin: center top;
  /* `backwards` only: a forwards fill would override the depth transform
     below once a newer toast pushed this one back. The entry is the keyframe,
     not a transition — and it is deliberately longer than the re-stack, so
     <transition-group> measures the animation and waits on that. */
  animation: jbRise var(--dur-reveal) var(--ease-brand) backwards;
  transition:
    transform var(--dur-hover) var(--ease-brand),
    opacity var(--dur-hover) var(--ease-brand);
}

.toast__accent {
  flex: 0 0 auto;
  width: 2px;
  height: 14px;
  border-radius: var(--radius-brand);
}

.toast__text {
  flex: 1;
  margin: 0;
  min-width: 0;
  font-size: 12px;
  line-height: 1.5;
  letter-spacing: 0.04em;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  overflow: hidden;
}

.toast__close {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: var(--radius-brand);
  background: none;
  color: inherit;
  opacity: 0.5;
  cursor: pointer;
  transition: opacity var(--dur-hover) var(--ease-brand);
}

.toast__close:hover {
  opacity: 1;
}

.toast__close:focus-visible {
  outline: 1px solid currentColor;
  outline-offset: 2px;
}

/* ── Depth ─────────────────────────────────────────────────────────────── */
.toast--depth-0 {
  z-index: 3;
  transform: none;
  opacity: 1;
}
.toast--depth-1 {
  z-index: 2;
  transform: translateY(-25%) scale(0.92);
  opacity: 0.9;
}
.toast--depth-2 {
  z-index: 1;
  transform: translateY(-50%) scale(0.84);
  opacity: 0.75;
}
.toast--depth-out {
  z-index: 0;
  transform: translateY(-75%) scale(0.75);
  opacity: 0;
  pointer-events: none;
}

/* ── Transitions ───────────────────────────────────────────────────────── */
.alert-move {
  transition: transform var(--dur-hover) var(--ease-brand);
}

.alert-leave-active {
  position: absolute;
  bottom: 0;
  z-index: -1;
  transition:
    transform var(--dur-hover) var(--ease-brand),
    opacity var(--dur-hover) var(--ease-brand);
}

.alert-leave-to {
  opacity: 0;
  transform: translateY(-12px) scale(0.92);
}
</style>
