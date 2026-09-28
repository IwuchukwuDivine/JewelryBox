/** Aggregator over the app store — the session and the toast stack. */
export default () => {
  const appStore = useAppStore();
  const { toasts, isLoggedIn, user, isAdmin, firstName } = storeToRefs(appStore);
  const { removeToast, setUser } = appStore;
  return {
    toasts,
    isLoggedIn,
    user,
    isAdmin,
    firstName,
    removeToast,
    setUser,
  };
};
