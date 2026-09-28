import type {
  AddressRepository,
  AnnouncementsRepository,
  AuthRepository,
  DeliveryRepository,
  OrdersRepository,
  ProductsRepository,
  WishlistRepository,
} from "~/utils/types/api";
import {
  mockAddressRepo,
  mockAnnouncementsRepo,
  mockAuthRepo,
  mockDeliveryRepo,
  mockOrdersRepo,
  mockProductsRepo,
  mockWishlistRepo,
} from "~/utils/mock";

/**
 * The seam between the two lanes — and the only file Phase F edits.
 *
 * Composables import these singletons and never learn where the data came
 * from. Swapping a lane to Supabase is one line here:
 *
 *   export const productsRepo: ProductsRepository = supabaseProductsRepo;
 *
 * The checklist asks for one swap per commit, in this order:
 * products → announcements → auth → wishlist → cart → delivery → orders → admin.
 *
 * Both sides satisfy the same interface from `types/api.ts`, so a repository
 * that drifts from the contract fails `npm run typecheck`, not review.
 */

export const productsRepo: ProductsRepository = mockProductsRepo;
export const announcementsRepo: AnnouncementsRepository = mockAnnouncementsRepo;
export const authRepo: AuthRepository = mockAuthRepo;
export const wishlistRepo: WishlistRepository = mockWishlistRepo;
export const deliveryRepo: DeliveryRepository = mockDeliveryRepo;
export const ordersRepo: OrdersRepository = mockOrdersRepo;
export const addressRepo: AddressRepository = mockAddressRepo;
