export default (
  type: "success" | "error" | "warning" | "info",
  notification: string,
) => {
  const { removeToast, toasts } = useApp();
  if (toasts.value.some((toast) => toast.notification === notification)) return;
  const newToast = {
    type,
    notification,
    id: uuid(10),
  };
  if (toasts.value.length < 3) {
    toasts.value.unshift(newToast);
  } else {
    toasts.value.pop();
    toasts.value.unshift(newToast);
  }

  // schedule removal of toast
  setTimeout(() => {
    removeToast(newToast.id);
  }, 5000);
};
