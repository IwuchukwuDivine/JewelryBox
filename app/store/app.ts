import type { Toast } from "~/utils/types/general";

export const useAppStore = defineStore(
  "app",
  () => {
    const toasts = ref<Toast[]>([]);
    const isLoggedIn = ref(false);

    /******************* Actions *******************/
    const removeToast = (id: string) => {
      toasts.value = toasts.value.filter((toast) => toast.id !== id);
    };

    return {
      toasts,
      isLoggedIn,
      removeToast,
    };
  },
  {
    persist: {
      storage: import.meta.client ? localStorage : undefined,
      omit: ["toasts"],
    },
  },
);
