// `Rule` is declared once in utils/types/forms.ts and auto-imported, so it is
// deliberately not re-exported here — two exports of the same name make Nuxt
// pick one and warn about the other.
import type { Rule } from "~/utils/types/forms";

export const requiredRules: Rule[] = [
  {
    rule: (value: string | number) =>
      !!value && String(value).trim().length > 0,
    message: "This field is required",
  },
];

export const emailRules: Rule[] = [
  {
    rule: (value: string | number) => !!value,
    message: "An email address is required",
  },
  {
    rule: (value: string | number) =>
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(String(value)),
    message: "Enter a valid email address",
  },
];

export const passwordRules: Rule[] = [
  {
    rule: (value: string | number) => !!value,
    message: "Password is required",
  },
  {
    rule: (value: string | number) => String(value).length >= 8,
    message: "Password must be at least 8 characters long",
  },
  {
    rule: (value: string | number) => String(value).length <= 20,
    message: "Password must be less than 20 characters long",
  },
  {
    rule: (value: string | number) => /[a-z]/.test(String(value)),
    message: "Password must contain at least one lowercase letter (a-z)",
  },
  {
    rule: (value: string | number) => /[A-Z]/.test(String(value)),
    message: "Password must contain at least one uppercase letter (A-Z)",
  },
  {
    rule: (value: string | number) => /\d/.test(String(value)),
    message: "Password must contain at least one number (0-9)",
  },
];

/**
 * Length factories. Both trim first — a field padded with spaces is empty.
 */
export const minLength = (n: number): Rule => ({
  rule: (value: string | number) => String(value).trim().length >= n,
  message: `Use at least ${n} characters.`,
});

export const maxLength = (n: number): Rule => ({
  rule: (value: string | number) => String(value).trim().length <= n,
  message: `Use ${n} characters or fewer.`,
});

/**
 * Confirmation fields. `other` is a getter so the rule reads the partner
 * field at validation time rather than capturing its value once.
 */
export const matches = (
  other: () => string | number,
  label: string = "values",
): Rule => ({
  rule: (value: string | number) => String(value) === String(other()),
  message: `The two ${label} do not match.`,
});

/**
 * Nigerian mobile numbers. Accepts 0XXXXXXXXXX, +234XXXXXXXXXX and
 * 234XXXXXXXXXX; spaces, dashes and brackets are stripped before the test.
 */
export const phoneRules: Rule[] = [
  {
    rule: (value: string | number) =>
      !!value && String(value).trim().length > 0,
    message: "A phone number is required.",
  },
  {
    rule: (value: string | number) =>
      /^(?:0\d{10}|\+?234\d{10})$/.test(String(value).replace(/[\s\-()]/g, "")),
    message: "Enter an 11-digit Nigerian number.",
  },
];

export const nameRules: Rule[] = [
  {
    rule: (value: string | number) =>
      !!value && String(value).trim().length > 0,
    message: "A name is required.",
  },
  {
    rule: (value: string | number) => String(value).trim().length >= 2,
    message: "Use at least 2 characters.",
  },
];
