import { LAGOS } from "~/utils/types/shop";
import type { DeliveryMethod } from "~/utils/types/shop";

/**
 * Which way a piece travels to a given state.
 *
 * Lagos goes by dispatch rider and is priced per area; everywhere else goes by
 * flight and is priced per state. The customer never picks this — checkout
 * derives it from the address, and `place_order` derives it again server-side
 * rather than trusting what the client sent.
 */
export default (state: string): DeliveryMethod =>
  state.trim().toLowerCase() === LAGOS.toLowerCase() ? "dispatch" : "flight";
