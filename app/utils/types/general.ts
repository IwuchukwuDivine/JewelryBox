export type Toast = {
  type: "success" | "error" | "warning" | "info";
  notification: string;
  id: string;
};
