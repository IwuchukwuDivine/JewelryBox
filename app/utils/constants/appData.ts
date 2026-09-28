/**
 * Toast accent colours.
 *
 * These are `var()` references rather than hexes so toasts follow the
 * theme — the values live in :root / .dark in assets/css/main.css. Both
 * consumers (an SVG `stroke` and a `background-color`) accept a custom
 * property, so nothing needs a literal here.
 */
export const STATUS_COLORS = {
  success: "var(--color-success)",
  error: "var(--color-error)",
  warning: "var(--color-warning)",
  info: "var(--color-info)",
} as const;

export type StatusColor = keyof typeof STATUS_COLORS;
