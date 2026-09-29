import type { Toast } from "~/utils/types/general";
import type { SessionUser } from "~/utils/types/api";

export const useAppStore = defineStore(
  "app",
  () => {
    const toasts = ref<Toast[]>([]);
    const isLoggedIn = ref(false);
    const user = ref<SessionUser | null>(null);

    /******************* Getters *******************/
    const isAdmin = computed(() => user.value?.is_admin === true);

    const firstName = computed(
      () => user.value?.full_name?.trim().split(/\s+/)[0] ?? "",
    );

    /******************* Actions *******************/
    const removeToast = (id: string) => {
      toasts.value = toasts.value.filter((toast) => toast.id !== id);
    };

    /** Single place the session is applied, so nothing drifts out of step. */
    const setUser = (next: SessionUser | null) => {
      user.value = next;
      isLoggedIn.value = Boolean(next);
    };

    return {
      toasts,
      isLoggedIn,
      user,
      isAdmin,
      firstName,
      removeToast,
      setUser,
    };
  },
  {
    persist: {
      storage: import.meta.client ? localStorage : undefined,
      // The session is owned by the auth repository, not by this store —
      // persisting it would desync SSR markup from the real session.
      omit: ["toasts", "user", "isLoggedIn"],
    },
  },
);
