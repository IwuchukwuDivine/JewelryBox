import { useAppStore } from "~/store/app";

export default () => {
  const appStore = useAppStore();
  const { toasts, isLoggedIn } = storeToRefs(appStore);
  const { removeToast } = appStore;
  return {
    toasts,
    isLoggedIn,
    removeToast,
  };
};
