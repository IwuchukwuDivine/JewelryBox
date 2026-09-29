<template>
  <AppRadio
    :model-value="modelValue"
    :options="options"
    :label="label"
    :error="error"
    name="payment-method"
    required
    @update:model-value="pick"
  />
</template>

<script setup lang="ts">
import type { PaymentMethod } from "~/utils/types/shop";

/**
 * The only two ways to pay: bank transfer and pay on delivery.
 *
 * The list is `PAYMENT_METHODS` and nothing else — the prototype's Paystack
 * and Flutterwave cards are stale, there is no card processor, and a method
 * that is not in that constant is rejected by `place_order` as
 * `invalid_payment_method`.
 */
defineProps<{
  modelValue: PaymentMethod | null;
  label?: string;
  error?: string;
}>();

const emit = defineEmits<{ "update:modelValue": [value: PaymentMethod] }>();

const options = computed(() =>
  PAYMENT_METHODS.map((method) => ({
    label: method.label,
    value: method.value,
    description: method.description,
  })),
);

const pick = (value: string) => {
  emit("update:modelValue", value as PaymentMethod);
};
</script>
