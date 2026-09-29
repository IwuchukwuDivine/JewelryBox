import { useQuery } from "@tanstack/vue-query";
import type { MaybeRefOrGetter } from "vue";
import type { DeliveryOptions, DeliverySelection } from "~/utils/types/shop";

/**
 * Where it goes, and therefore how.
 *
 * The customer never picks a delivery method: Lagos goes by dispatch rider
 * priced per area, everywhere else goes by air freight priced per state.
 * Checkout asks for the destination and this derives the rest.
 */

export const useDeliveryOptionsQuery = () =>
  useQuery<DeliveryOptions>({
    queryKey: ["delivery-options"],
    staleTime: 10 * 60 * 1000,
    queryFn: () => deliveryRepo.options(),
  });

/**
 * Resolve a destination to a method, a label and a fee.
 *
 * `data` of `null` is NOT an error — it means the destination is unpriced.
 * The order is still placed with `delivery_fee_ngn: null` and the fee follows
 * by email. Checkout renders "Delivery quoted after you order" and continues.
 */
export const useDeliveryQuoteQuery = (
  destination: MaybeRefOrGetter<{ state: string; area?: string }>,
) =>
  useQuery<DeliverySelection | null>({
    queryKey: ["delivery-quote", () => toValue(destination)] as const,
    queryFn: () => deliveryRepo.resolve(toValue(destination)),
    enabled: () => {
      const { state, area } = toValue(destination);
      if (!state.trim()) return false;
      // A Lagos address is not answerable until the area is chosen.
      return deliveryMethodForState(state) === "flight" || Boolean(area?.trim());
    },
  });
