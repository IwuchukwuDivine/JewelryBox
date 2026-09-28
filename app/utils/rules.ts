export type Rule = {
  rule: (value: string | number) => boolean;
  message: string;
};

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
