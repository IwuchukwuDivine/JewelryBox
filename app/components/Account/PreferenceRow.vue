<template>
  <button
    type="button"
    class="pref"
    role="switch"
    :aria-checked="modelValue"
    @click="emit('update:modelValue', !modelValue)"
  >
    <span class="pref__text">
      <span class="pref__label">{{ label }}</span>
      <span class="pref__description">{{ description }}</span>
    </span>

    <span class="pref__track" :class="{ 'pref__track--on': modelValue }" aria-hidden="true">
      <span class="pref__knob" />
    </span>
  </button>
</template>

<script setup lang="ts">
/**
 * One line of the account's preference list.
 *
 * The whole row is the switch — a 36×20 track with a 12px knob that travels
 * 3px to 19px, the only place in the system where something slides. The track
 * fills with the text colour when the setting is on, so the state reads at a
 * glance in either theme.
 */
defineProps<{
  label: string;
  description: string;
  modelValue: boolean;
}>();

const emit = defineEmits<{ "update:modelValue": [value: boolean] }>();
</script>

<style scoped>
.pref {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  min-height: 60px;
  padding: 12px 0;
  border: none;
  border-bottom: 1px solid var(--border-default);
  background: none;
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
}

.pref:focus-visible {
  outline: 2px solid var(--ring-default);
  outline-offset: 2px;
}

.pref__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.pref__label {
  font-family: var(--font-body);
  font-size: 14px;
  line-height: 1.3;
}

.pref__description {
  font-size: 12px;
  line-height: 1.4;
  color: var(--text-secondary);
}

.pref__track {
  position: relative;
  flex: 0 0 auto;
  width: 36px;
  height: 20px;
  border: 1px solid var(--text-primary);
  border-radius: 10px;
  background: transparent;
  transition: background-color var(--dur-hover) var(--ease-brand);
}

.pref__track--on {
  background: var(--text-primary);
}

.pref__knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--text-primary);
  transition: left 0.3s var(--ease-brand);
}

.pref__track--on .pref__knob {
  left: 19px;
  background: var(--surface);
}
</style>
