// Keep in sync with the status colors in assets/css/main.css @theme block
export const STATUS_COLORS = {
  success: "#10b981",
  error: "#e03e3e",
  warning: "#f59e0b",
  info: "#3b82f6",
} as const;

export type StatusColor = keyof typeof STATUS_COLORS;
