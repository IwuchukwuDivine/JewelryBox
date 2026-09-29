<template>
  <div class="dash">
    <AdminPageHead title="Dashboard" eyebrow="JewelryBox" :meta="today" />

    <!-- Figures -->
    <section aria-labelledby="dash-figures">
      <h2 id="dash-figures" class="sr-only">Figures</h2>

      <div v-if="statsPending" class="dash__tiles" aria-busy="true">
        <AppSkeleton v-for="n in 6" :key="n" height="86px" />
      </div>

      <div v-else-if="stats" class="hairline-table dash__tiles">
        <AccountStatTile :figure="stats.orders_total" label="Orders" />
        <AccountStatTile :figure="stats.orders_awaiting_payment" label="Awaiting payment" />
        <AccountStatTile :figure="stats.orders_to_ship" label="To ship" />
        <AccountStatTile :figure="formatPrice(stats.revenue_ngn)" label="Revenue" />
        <AccountStatTile :figure="stats.products_total" label="Pieces" />
        <AccountStatTile :figure="stats.products_out_of_stock" label="Out of stock" />
      </div>

      <AppEmptyState
        v-else
        title="Figures unavailable."
        message="The dashboard could not read your shop's totals. Reload to try again."
      />
    </section>

    <!-- Recent orders -->
    <section class="dash__panel" aria-labelledby="dash-orders">
      <div class="dash__panel-head">
        <h2 id="dash-orders" class="display-heading dash__panel-title">Recent orders</h2>
        <NuxtLink class="text-link" to="/admin/orders">All orders</NuxtLink>
      </div>

      <div v-if="ordersPending" class="dash__rows" aria-busy="true">
        <AppSkeleton v-for="n in 5" :key="n" height="62px" />
      </div>

      <div v-else-if="recentOrders.length" class="hairline-table dash__orders">
        <NuxtLink
          v-for="order in recentOrders"
          :key="order.id"
          class="hairline-table__cell dash__order"
          :to="`/admin/orders?order=${order.order_number}`"
        >
          <span class="dash__ref">{{ order.order_number }}</span>
          <span class="dash__who">{{ order.shipping_address.full_name }}</span>
          <span class="dash__when mono-meta">{{ shortDate(order.created_at) }}</span>
          <span class="price dash__total">{{ formatPrice(order.total_ngn) }}</span>
          <OrderStatusBadge
            :status="order.status"
            :payment-method="order.payment_method"
            admin
            :show-position="false"
          />
        </NuxtLink>
      </div>

      <AppEmptyState
        v-else
        title="No orders yet."
        message="The first order will appear here the moment it is placed."
      />
    </section>

    <!-- Low stock -->
    <section class="dash__panel" aria-labelledby="dash-stock">
      <div class="dash__panel-head">
        <h2 id="dash-stock" class="display-heading dash__panel-title">Needs restocking</h2>
        <NuxtLink class="text-link" to="/admin/products">All pieces</NuxtLink>
      </div>

      <div v-if="lowStockPending" class="dash__rows" aria-busy="true">
        <AppSkeleton v-for="n in 3" :key="n" height="62px" />
      </div>

      <div v-else-if="lowStock.length" class="hairline-table dash__stock">
        <NuxtLink
          v-for="product in lowStock"
          :key="product.id"
          class="hairline-table__cell dash__piece"
          :to="`/admin/products/${product.id}`"
        >
          <NuxtImg
            v-if="product.images[0]"
            :src="product.images[0]"
            :alt="product.name"
            width="44"
            height="44"
            class="dash__thumb"
          />
          <span v-else class="dash__thumb dash__thumb--empty" aria-hidden="true" />

          <span class="dash__piece-name">{{ product.name }}</span>
          <span class="mono-meta dash__piece-count">{{ stockLabel(product) }}</span>
        </NuxtLink>
      </div>

      <AppEmptyState
        v-else
        title="Everything is in stock."
        message="No piece is sold out or down to its last few."
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import type { Product } from "~/utils/types/shop";

definePageMeta({ layout: "admin", middleware: "admin" });

/**
 * The admin landing page: what happened, and what needs doing.
 *
 * `ogImage: false` — a share card is pointless for a noindex page behind an
 * admin guard, and rendering one costs a Satori pass per deploy.
 */
usePageSeo({
  title: "Dashboard",
  description: "JewelryBox admin dashboard.",
  path: "/admin",
  robots: "noindex, nofollow",
  ogImage: false,
});

const { data: stats, isPending: statsPending } = useAdminStatsQuery();

const { data: orderPage, isPending: ordersPending } = useAdminOrdersQuery({ perPage: 5 });
const recentOrders = computed(() => orderPage.value?.items ?? []);

const { data: lowStockAll, isPending: lowStockPending } = useAdminLowStockQuery();
/** Eight is as many as this panel can show before it stops being a summary. */
const lowStock = computed(() => (lowStockAll.value ?? []).slice(0, 8));

const today = new Date().toLocaleDateString("en-NG", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

/** Compact enough for a table cell — `formatDate` carries the time too. */
const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const stockLabel = (product: Product) =>
  productAvailability(product) === "sold"
    ? "Sold out"
    : `${product.stock_count} left`;
</script>

<style scoped>
.dash__tiles {
  grid-template-columns: repeat(2, 1fr);
}

.dash__panel {
  margin-top: 44px;
}

.dash__panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.dash__panel-title {
  margin: 0;
  font-size: 17px;
}

.dash__rows {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.dash__orders,
.dash__stock {
  grid-template-columns: 1fr;
}

.dash__order {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 6px 14px;
  text-decoration: none;
  color: inherit;
  transition: background var(--dur-hover) var(--ease-brand);
}

.dash__order:hover,
.dash__piece:hover {
  background: var(--surface-muted);
}

.dash__ref {
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.06em;
  color: var(--text-primary);
}

.dash__who {
  grid-column: 1;
  font-size: 13px;
  color: var(--text-secondary);
}

.dash__when {
  grid-column: 1;
}

.dash__total {
  grid-row: 1;
  grid-column: 2;
  justify-self: end;
  font-size: 14px;
  color: var(--text-primary);
}

.dash__piece {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: inherit;
  transition: background var(--dur-hover) var(--ease-brand);
}

.dash__thumb {
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  object-fit: cover;
  border-radius: var(--radius-brand);
}

.dash__thumb--empty {
  background: var(--surface-muted);
  border: 1px solid var(--border-default);
}

.dash__piece-name {
  flex: 1;
  font-size: 13px;
  color: var(--text-primary);
}

.dash__piece-count {
  flex: 0 0 auto;
  color: var(--color-warning);
}

@media (min-width: 768px) {
  .dash__tiles {
    grid-template-columns: repeat(3, 1fr);
  }

  .dash__order {
    grid-template-columns: 130px 1fr 130px 120px auto;
  }

  .dash__who,
  .dash__when,
  .dash__total {
    grid-column: auto;
    grid-row: 1;
  }

  .dash__total {
    justify-self: end;
  }
}

@media (min-width: 1100px) {
  .dash__tiles {
    grid-template-columns: repeat(6, 1fr);
  }
}
</style>
