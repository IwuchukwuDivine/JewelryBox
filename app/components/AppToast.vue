<template>
  <div class="alert-panel-container">
    <transition-group id="alert-sequence" name="alert" tag="ul">
      <div
        v-for="(notification, index) in toasts"
        :key="notification.id"
        :class="[stackClass(index), toastMap[notification.type].classes]"
        class="toast-card"
      >
        <div
          class="toast-accent"
          :style="{ backgroundColor: toastMap[notification.type].accent }"
        />
        <div class="flex flex-1 items-center gap-3 px-4 py-3">
          <component
            :is="toastMap[notification.type].icon"
            :color="toastMap[notification.type].accent"
            :size="20"
            :stroke-width="2.25"
          />
          <p class="flex-1 text-sm leading-snug line-clamp-3">
            {{ notification.notification }}
          </p>
          <button
            class="toast-close"
            aria-label="Dismiss"
            @click="removeToast(notification.id)"
          >
            <lucide-x :size="14" :stroke-width="2.5" />
          </button>
        </div>
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { CircleX, AlertTriangle, Info, CircleCheck } from "lucide-vue-next";
import { STATUS_COLORS } from "~/utils/constants/appData";

const { removeToast, toasts } = useApp();

const toastMap = {
  success: {
    accent: STATUS_COLORS.success,
    icon: CircleCheck,
    classes: "bg-green-50 text-green-900 ring-1 ring-green-200",
  },
  error: {
    accent: STATUS_COLORS.error,
    icon: CircleX,
    classes: "bg-red-50 text-red-900 ring-1 ring-red-200",
  },
  warning: {
    accent: STATUS_COLORS.warning,
    icon: AlertTriangle,
    classes: "bg-amber-50 text-amber-900 ring-1 ring-amber-200",
  },
  info: {
    accent: STATUS_COLORS.info,
    icon: Info,
    classes: "bg-blue-50 text-blue-900 ring-1 ring-blue-200",
  },
} as const;

const stackClasses = [
  "z-30 scale-100 translate-y-0 opacity-100",
  "z-20 scale-[0.92] -translate-y-1/4 opacity-90",
  "z-10 scale-[0.84] -translate-y-1/2 opacity-75",
] as const;

const stackClass = (index: number) =>
  index < stackClasses.length
    ? stackClasses[index]
    : "z-0 scale-75 -translate-y-3/4 opacity-0 pointer-events-none";
</script>

<style scoped>
.alert-panel-container {
  position: fixed;
  z-index: 1000;
  top: 1.25rem;
  left: 50%;
  width: min(26rem, calc(100vw - 2rem));
  transform: translateX(-50%);
  pointer-events: none;
}

#alert-sequence {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.toast-card {
  position: relative;
  display: flex;
  width: 100%;
  overflow: hidden;
  border-radius: 0.75rem;
  box-shadow:
    0 4px 6px -1px rgb(0 0 0 / 0.06),
    0 2px 4px -2px rgb(0 0 0 / 0.06);
  backdrop-filter: blur(8px);
  pointer-events: auto;
  transform-origin: center top;
  transition:
    transform 400ms cubic-bezier(0.16, 1, 0.3, 1),
    opacity 400ms cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-accent {
  width: 4px;
  flex-shrink: 0;
  border-radius: 4px 0 0 4px;
}

.toast-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  flex-shrink: 0;
  border-radius: 9999px;
  opacity: 0.4;
  cursor: pointer;
  transition:
    opacity 150ms ease,
    background-color 150ms ease;
}

.toast-close:hover {
  opacity: 1;
  background-color: var(--surface-subtle);
}

/* Transitions */
.alert-enter-active {
  transition: all 450ms cubic-bezier(0.16, 1, 0.3, 1);
}

.alert-leave-active {
  position: absolute;
  bottom: 0;
  z-index: -100;
  transition: all 300ms cubic-bezier(0.4, 0, 1, 1);
}

.alert-move {
  transition: all 450ms cubic-bezier(0.16, 1, 0.3, 1);
}

.alert-enter-from {
  opacity: 0;
  transform: translateY(-100%) scale(0.95);
}

.alert-leave-to {
  opacity: 0;
  transform: translateX(-30%) scale(0.9);
}
</style>
