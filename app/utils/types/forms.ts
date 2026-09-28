import type { Ref } from "vue";

/**
 * Form and disclosure contracts.
 *
 * `AppForm` provides `FormContext` through provide/inject; each `AppInput`
 * registers its own validity so the form can report a single `isValid`.
 * Validation rules live in `app/utils/rules.ts`.
 *
 * Toast shapes live in `utils/types/general.ts` — `AppToast` already consumes
 * them and the store persists around them.
 */

export type Rule = {
  rule: (value: string | number) => boolean;
  message: string;
};

export interface FormContext {
  registerInput: (id: symbol, isValid: Ref<boolean>) => void;
  unregisterInput: (id: symbol) => void;
}

export interface AccordionContext {
  isOpen: (value: string) => boolean;
  toggle: (value: string) => void;
}
