import type { Address } from "~/utils/types/shop";

/**
 * The last delivery address the customer used, remembered on this device so
 * checkout prefills for guests as well as signed-in clients.
 */

const SAVED_ADDRESS_VERSION = 1;

const isAddress = (value: unknown): value is Address => {
  if (!value || typeof value !== "object") return false;
  const a = value as Record<string, unknown>;
  return (
    typeof a.full_name === "string" &&
    typeof a.email === "string" &&
    typeof a.phone === "string" &&
    typeof a.line1 === "string" &&
    typeof a.city === "string" &&
    typeof a.state === "string"
  );
};

export const useSavedAddressStore = defineStore(
  "saved-address",
  () => {
    const address = ref<Address | null>(null);
    const version = ref(SAVED_ADDRESS_VERSION);

    /******************* Actions *******************/
    const remember = (value: Address) => {
      address.value = { ...value };
    };

    const forget = () => {
      address.value = null;
    };

    return { address, version, remember, forget };
  },
  {
    persist: {
      storage: import.meta.client ? localStorage : undefined,
      afterHydrate: (context): void => {
        const store = context.store as unknown as {
          version: number;
          address: Address | null;
        };
        if (store.version !== SAVED_ADDRESS_VERSION || !isAddress(store.address)) {
          store.address = null;
          store.version = SAVED_ADDRESS_VERSION;
        }
      },
    },
  },
);
