import type {
  AddressRepository,
  AdminAnnouncementsRepository,
  AdminOrdersRepository,
  AdminProductsRepository,
  AdminRatesRepository,
  AdminSettingsRepository,
  AdminStatsRepository,
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
import {
  supabaseAdminAnnouncementsRepo,
  supabaseAdminOrdersRepo,
  supabaseAdminProductsRepo,
  supabaseAdminRatesRepo,
  supabaseAdminSettingsRepo,
  supabaseAdminStatsRepo,
} from "~/utils/api";

/**
 * The seam between the two lanes — and the only file Phase F edits.
 *
 * Composables import these singletons and never learn where the data came
 * from. Swapping a lane to Supabase is one line here:
 *
 *   export const productsRepo: ProductsRepository = supabaseProductsRepo;
 *
 * The checklist asks for one swap per commit, in this order:
 * products → announcements → auth → wishlist → cart → delivery → orders.
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

/**
 * The admin lane is Supabase from the start, so `admin` is absent from the
 * swap order above.
 *
 * There was never a reason to write fixture admin repositories: the six
 * Supabase ones landed in the backend lane already typed against these same
 * interfaces and covered by `tests/db/`, and there is no design source for
 * `/admin` to review a mock against — the storefront's reason for building on
 * fixtures does not apply here. The cost is that reviewing `/admin` needs
 * `npm run db:start` and an admin account; see README.md on promoting one.
 */
export const adminProductsRepo: AdminProductsRepository = supabaseAdminProductsRepo;
export const adminOrdersRepo: AdminOrdersRepository = supabaseAdminOrdersRepo;
export const adminRatesRepo: AdminRatesRepository = supabaseAdminRatesRepo;
export const adminAnnouncementsRepo: AdminAnnouncementsRepository =
  supabaseAdminAnnouncementsRepo;
export const adminSettingsRepo: AdminSettingsRepository = supabaseAdminSettingsRepo;
export const adminStatsRepo: AdminStatsRepository = supabaseAdminStatsRepo;
