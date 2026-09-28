/**
 * Saved pieces, local-first.
 *
 * The store answers immediately so the diamond toggles without a round trip
 * and guests get a working wishlist. When the customer is signed in, the
 * change is written through to the repository; a failed write is logged, not
 * surfaced — losing a save is not worth an error toast mid-browse.
 */
export default () => {
  const store = useWishlistStore();
  const { ids, count } = storeToRefs(store);
  const { isLoggedIn } = useApp();
  const { track } = useTag();

  const writeThrough = (fn: () => Promise<void>) => {
    if (!isLoggedIn.value) return;
    fn().catch((error) => log.error("wishlist sync failed", error));
  };

  const toggle = (productId: string, slug?: string): boolean => {
    const added = store.toggle(productId);

    writeThrough(() =>
      added ? wishlistRepo.add(productId) : wishlistRepo.remove(productId),
    );

    if (slug) track("wishlist_toggle", { slug, action: added ? "add" : "remove" });
    return added;
  };

  const remove = (productId: string) => {
    store.remove(productId);
    writeThrough(() => wishlistRepo.remove(productId));
  };

  /** Called after sign-in: the device's saves win, then both sides agree. */
  const merge = async () => {
    if (!isLoggedIn.value) return;
    try {
      store.set(await wishlistRepo.merge([...ids.value]));
    } catch (error) {
      log.error("wishlist merge failed", error);
    }
  };

  return {
    ids,
    count,
    has: store.has,
    toggle,
    remove,
    merge,
    clear: store.clear,
  };
};
