import { useQuery, useQueryClient } from "@tanstack/vue-query";
import type { MaybeRefOrGetter } from "vue";
import type { Address, Order, PaymentMethod } from "~/utils/types/shop";

/**
 * Placing and reading orders.
 *
 * The client never sends a price. `place()` receives product ids, quantities,
 * an address and a payment method; the server reprices every line, derives
 * the delivery method from the address state and resolves the fee itself.
 */

export const useOrderQuery = (orderRef: MaybeRefOrGetter<string>) => {
  const mounted = useMounted();
  const recent = useRecentOrdersStore();
  const { isLoggedIn } = useApp();

  return useQuery<Order | null>({
    queryKey: ["order", () => toValue(orderRef)] as const,
    // Guest lookup reads a device-local pointer, so this cannot run on the server.
    enabled: () => mounted.value && Boolean(toValue(orderRef)),
    queryFn: async () => {
      const ref = toValue(orderRef);

      // Signed in: the customer's own row, scoped by the database.
      if (isLoggedIn.value) {
        const own = await ordersRepo.byId(ref);
        if (own) return own;
      }

      // Guest: recover the {order_number, email} pair this device remembers.
      const pointer = recent.findRef(ref);
      if (!pointer) return null;
      return ordersRepo.lookup(pointer.order_number, pointer.email);
    },
  });
};

export const useMyOrdersQuery = () => {
  const mounted = useMounted();
  const { isLoggedIn } = useApp();

  return useQuery<Order[]>({
    queryKey: ["my-orders"],
    enabled: () => mounted.value && isLoggedIn.value,
    queryFn: () => ordersRepo.mine(),
  });
};

/** Guest tracking by order number + email, from `/track`. */
export const useOrderLookup = () => {
  const recent = useRecentOrdersStore();

  return async (orderNumber: string, email: string): Promise<Order | null> => {
    const order = await ordersRepo.lookup(orderNumber, email);
    // Remember it so /order/[id] works on this device from now on.
    if (order) {
      recent.remember({
        id: order.id,
        order_number: order.order_number,
        email: order.shipping_address.email,
      });
    }
    return order;
  };
};

export default () => {
  const cart = useCartStore();
  const recent = useRecentOrdersStore();
  const queryClient = useQueryClient();
  const { track } = useTag();

  const placeOrder = async (
    address: Address,
    payment_method: PaymentMethod,
    rateId?: string,
  ): Promise<Order> => {
    track("begin_checkout", {
      value: cart.subtotal,
      items: cart.count,
    });

    const order = await ordersRepo.place({
      items: cart.items.map((line) => ({
        product_id: line.product_id,
        quantity: line.quantity,
        ...(line.variant_id ? { variant_id: line.variant_id } : {}),
      })),
      address,
      delivery: rateId ? { rate_id: rateId } : {},
      payment_method,
    });

    recent.remember({
      id: order.id,
      order_number: order.order_number,
      email: order.shipping_address.email,
    });
    cart.clear();
    await queryClient.invalidateQueries({ queryKey: ["my-orders"] });

    return order;
  };

  return { placeOrder };
};
