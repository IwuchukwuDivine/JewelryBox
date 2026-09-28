import type { Product, ProductVariant } from "~/utils/types/shop";

/**
 * The bag. A thin, analytics-aware wrapper over the cart store — components
 * talk to this, never to the store directly, so every add and remove is
 * measured in one place.
 */
export default () => {
  const store = useCartStore();
  const { items, count, subtotal, isEmpty } = storeToRefs(store);
  const { track } = useTag();

  const add = (product: Product, quantity = 1, variant?: ProductVariant) => {
    store.add(product, quantity, variant);
    track("add_to_bag", {
      slug: product.slug,
      price: variant?.price_ngn ?? product.price_ngn,
      quantity,
    });
  };

  const remove = (lineKey: string) => {
    const line = items.value.find((l) => cartLineKey(l) === lineKey);
    store.remove(lineKey);
    if (line) track("remove_from_bag", { slug: line.slug });
  };

  return {
    items,
    count,
    subtotal,
    isEmpty,
    add,
    remove,
    setQuantity: store.setQuantity,
    clear: store.clear,
  };
};
