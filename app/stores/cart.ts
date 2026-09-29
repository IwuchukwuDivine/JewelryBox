import type { CartLine, Product, ProductVariant } from "~/utils/types/shop";

/**
 * The bag. Persisted to localStorage so it survives a reload, and versioned so
 * a shape change drops stale carts instead of rendering broken lines.
 *
 * Prices stored here are a display snapshot only — `place_order` reprices every
 * line server-side, so a tampered cart cannot change what the customer pays.
 */

/*
 * BUMP THIS AT PHASE F. Mock product ids are `prd_001`; the real schema uses
 * `gen_random_uuid()`. Every persisted cart in a returning browser goes
 * stale the moment the repositories swap, and `afterHydrate` below only
 * clears it if the version no longer matches.
 */
const CART_VERSION = 1;
const CART_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_DISTINCT_LINES = 50;
const MAX_QUANTITY = 99;

const isValidLine = (line: unknown): line is CartLine => {
  if (!line || typeof line !== "object") return false;
  const l = line as Record<string, unknown>;
  return (
    typeof l.product_id === "string" &&
    typeof l.slug === "string" &&
    typeof l.name === "string" &&
    typeof l.price_ngn === "number" &&
    Number.isFinite(l.price_ngn) &&
    typeof l.quantity === "number" &&
    l.quantity > 0
  );
};

export const useCartStore = defineStore(
  "cart",
  () => {
    const items = ref<CartLine[]>([]);
    const version = ref(CART_VERSION);
    const updatedAt = ref(Date.now());

    /******************* Getters *******************/
    const count = computed(() =>
      items.value.reduce((total, line) => total + line.quantity, 0),
    );

    const subtotal = computed(() =>
      items.value.reduce((total, line) => total + line.price_ngn * line.quantity, 0),
    );

    const isEmpty = computed(() => items.value.length === 0);

    /******************* Actions *******************/
    const touch = () => {
      updatedAt.value = Date.now();
    };

    const add = (product: Product, quantity = 1, variant?: ProductVariant) => {
      const key = cartLineKey({ product_id: product.id, variant_id: variant?.id });
      const existing = items.value.find(
        (line) => cartLineKey(line) === key,
      );

      if (existing) {
        existing.quantity = Math.min(existing.quantity + quantity, MAX_QUANTITY);
        touch();
        return;
      }

      if (items.value.length >= MAX_DISTINCT_LINES) return;

      items.value.push({
        product_id: product.id,
        quantity: Math.min(quantity, MAX_QUANTITY),
        slug: product.slug,
        name: product.name,
        brand: product.brand,
        price_ngn: variant?.price_ngn ?? product.price_ngn,
        image: product.images[0] ?? "",
        category: product.category,
        ...(variant ? { variant_id: variant.id, variant_label: variant.label } : {}),
      });
      touch();
    };

    const remove = (lineKey: string) => {
      items.value = items.value.filter((line) => cartLineKey(line) !== lineKey);
      touch();
    };

    const setQuantity = (lineKey: string, quantity: number) => {
      if (quantity <= 0) return remove(lineKey);
      const line = items.value.find((l) => cartLineKey(l) === lineKey);
      if (!line) return;
      line.quantity = Math.min(quantity, MAX_QUANTITY);
      touch();
    };

    const clear = () => {
      items.value = [];
      touch();
    };

    const reset = () => {
      items.value = [];
      version.value = CART_VERSION;
      touch();
    };

    return {
      items,
      version,
      updatedAt,
      count,
      subtotal,
      isEmpty,
      add,
      remove,
      setQuantity,
      clear,
      reset,
      touch,
    };
  },
  {
    persist: {
      storage: import.meta.client ? localStorage : undefined,
      // Typed structurally, not as ReturnType<typeof useCartStore> — that
      // would reference the store inside its own initializer.
      afterHydrate: (context): void => {
        const store = context.store as unknown as {
          version: number;
          updatedAt: number;
          items: CartLine[];
          reset: () => void;
        };

        // A shape change or a week-old bag is not worth rescuing.
        if (store.version !== CART_VERSION) return store.reset();
        if (Date.now() - store.updatedAt > CART_TTL_MS) return store.reset();

        store.items = store.items.filter(isValidLine).slice(0, MAX_DISTINCT_LINES);
      },
    },
  },
);
