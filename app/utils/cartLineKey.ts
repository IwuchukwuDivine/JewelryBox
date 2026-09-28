import type { CartLine } from "~/utils/types/shop";

/**
 * Identity of a cart line.
 *
 * A product with variants can sit in the bag several times — the 40mm on an
 * ivory strap is not the same line as the 40mm on steel — so lines key on
 * product *and* variant. Without the variant in the key, adding a second
 * option silently increments the first one's quantity.
 */
export default (line: Pick<CartLine, "product_id" | "variant_id">): string =>
  line.variant_id ? `${line.product_id}::${line.variant_id}` : line.product_id;
