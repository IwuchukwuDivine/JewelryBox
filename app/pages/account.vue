<template>
  <AppContainer as="main" class="account">
    <!--
      The session is restored after hydration, so everything keyed on the
      customer waits for the client. The fallback holds the page's shape so
      nothing jumps when the name arrives.
    -->
    <ClientOnly>
      <header class="account__head">
        <p class="mono-meta">Client No. {{ clientNumber }}</p>
        <h1 class="display-heading account__title">{{ displayName }}</h1>
      </header>

      <AppTabs
        :model-value="underlinedTab"
        :tabs="TABS"
        aria-label="Account sections"
        class="account__tabs"
        @update:model-value="selectTab"
      />

      <!-- Overview -->
      <section v-if="tab === 'overview'" class="account__panel">
        <div class="hairline-table account__stats">
          <AccountStatTile :figure="orders.length" label="Orders" />
          <AccountStatTile :figure="savedCount" label="Saved" />
          <AccountStatTile :figure="addresses.length" label="Addresses" />
        </div>

        <AccountOrderCard v-if="latestOrder" :order="latestOrder" />

        <div class="account__rows">
          <NuxtLink class="list-row" to="/wishlist">
            <span class="account__row-title">Wishlist</span>
            <span aria-hidden="true">&rarr;</span>
          </NuxtLink>

          <button type="button" class="list-row account__signout" @click="onSignOut">
            <span>Log out</span>
          </button>
        </div>
      </section>

      <!-- Orders, and the hidden detail tab that keeps Orders underlined -->
      <section v-else-if="tab === 'orders' || tab === 'order'" class="account__panel">
        <div v-if="ordersPending" class="account__orders" aria-busy="true">
          <AppSkeleton v-for="n in 3" :key="n" height="94px" />
        </div>

        <div v-else-if="shownOrders.length" class="account__orders">
          <AccountOrderCard
            v-for="order in shownOrders"
            :key="order.id"
            :order="order"
          />
        </div>

        <AppEmptyState
          v-else
          title="Nothing ordered yet."
          message="Every piece you order while signed in is kept here, with its status."
        >
          <AppButton to="/">Explore the collection</AppButton>
        </AppEmptyState>

        <AppButton
          v-if="tab === 'order' && selectedOrder"
          variant="outline"
          :to="`/order/${selectedOrder.order_number}`"
        >
          Open the full order
        </AppButton>
      </section>

      <!-- Addresses -->
      <section v-else-if="tab === 'addresses'" class="account__panel">
        <AccountAddressCard
          v-for="address in addresses"
          :key="address.id"
          :address="address"
        />

        <AppEmptyState
          v-if="!addresses.length"
          title="No addresses saved."
          message="The address you use at checkout will be kept here, ready for the next piece."
        />

        <AppButton variant="outline" disabled>Add Address</AppButton>
      </section>

      <!-- Profile -->
      <section v-else-if="tab === 'profile'" class="account__panel">
        <AppForm
          v-model="profileValid"
          :loading="savingProfile"
          class="account__form"
          @submit="onSaveProfile"
        >
          <AppInput
            v-model="fullName"
            label="Full name"
            autocomplete="name"
            required
            :rules="nameRules"
          />

          <AppInput
            v-model="emailAddress"
            label="Email"
            type="email"
            :editable="false"
            hint="Write to the house to move an account to another address."
          />

          <AppInput
            v-model="phone"
            label="Phone"
            type="tel"
            autocomplete="tel"
            :rules="phone ? phoneRules : []"
          />

          <AppButton
            type="submit"
            class="account__save"
            :loading="savingProfile"
            :disabled="!profileValid"
          >
            Save
          </AppButton>
        </AppForm>
      </section>

      <!-- Preferences -->
      <section v-else class="account__panel account__prefs">
        <AccountPreferenceRow
          v-for="preference in PREFERENCES"
          :key="preference.key"
          :label="preference.label"
          :description="preference.description"
          :model-value="preferences[preference.key] ?? false"
          @update:model-value="preferences[preference.key] = $event"
        />
      </section>

      <template #fallback>
        <header class="account__head">
          <AppSkeleton variant="text" width="120px" />
          <AppSkeleton variant="text" width="62%" height="36px" />
        </header>
        <div class="account__orders">
          <AppSkeleton v-for="n in 3" :key="n" height="94px" />
        </div>
      </template>
    </ClientOnly>
  </AppContainer>
</template>

<script setup lang="ts">
import type { Address } from "~/utils/types/shop";

/**
 * The account.
 *
 * Six panels behind five tabs: `order` is reachable by query but never drawn
 * as a tab, and lends its underline to Orders while it is open.
 */
definePageMeta({ middleware: "auth" });

const route = useRoute();
const router = useRouter();
const { user, signOut, updateProfile } = useAuth();
const { count: savedCount } = useWishlist();
const { data: ordersData, isPending: ordersPending } = useMyOrdersQuery();

/* ── Identity ────────────────────────────────────────────────────────── */

const displayName = computed(
  () => user.value?.full_name || user.value?.email || "Your account",
);

/** `usr_00214` reads as JB-00214; a UUID gives up its last five characters. */
const clientNumber = computed(() => {
  const tail = (user.value?.id ?? "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(-5)
    .toUpperCase();
  return tail ? `JB-${tail}` : "JB-—";
});

/* ── Tabs ────────────────────────────────────────────────────────────── */

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "orders", label: "Orders" },
  { value: "addresses", label: "Addresses" },
  { value: "profile", label: "Profile" },
  { value: "preferences", label: "Preferences" },
];

const TAB_VALUES = [
  "overview",
  "orders",
  "addresses",
  "profile",
  "preferences",
  "order",
] as const;

type TabValue = (typeof TAB_VALUES)[number];

const isTabValue = (value: unknown): value is TabValue =>
  typeof value === "string" && (TAB_VALUES as readonly string[]).includes(value);

const tab = ref<TabValue>(isTabValue(route.query.tab) ? route.query.tab : "overview");

/** Deep links and the footer's `?tab=orders` both land through here. */
watch(
  () => route.query.tab,
  (value) => {
    tab.value = isTabValue(value) ? value : "overview";
  },
);

/** `order` is not a tab, so Orders holds the underline while it is open. */
const underlinedTab = computed(() => (tab.value === "order" ? "orders" : tab.value));

const selectTab = (value: string | number) => {
  if (!isTabValue(value)) return;
  tab.value = value;
  // Replaced, not pushed: a tab is a view of one page, not a step back through it.
  router.replace({ query: value === "overview" ? {} : { tab: value } });
};

/* ── Orders ──────────────────────────────────────────────────────────── */

const orders = computed(() => ordersData.value ?? []);
const latestOrder = computed(() => orders.value[0]);

const selectedOrder = computed(() =>
  orders.value.find((order) => order.order_number === route.query.order),
);

/**
 * The detail tab narrows the list to one order and offers the full record.
 * The timeline itself lives on `/order/[order_number]`, which owns it.
 */
const shownOrders = computed(() => {
  if (tab.value !== "order") return orders.value;
  return selectedOrder.value ? [selectedOrder.value] : orders.value;
});

/* ── Addresses ───────────────────────────────────────────────────────── */

/**
 * TODO(phase-f): saved addresses arrive with `AddressRepository`. There is no
 * composable over it yet and a page may not reach a repository directly, so
 * this stays empty and the panel renders its empty state. Wiring it is one
 * line here once `useAddresses()` exists.
 */
const addresses = ref<(Address & { id: string; is_default: boolean })[]>([]);

/* ── Profile ─────────────────────────────────────────────────────────── */

const fullName = ref(user.value?.full_name ?? "");
const emailAddress = ref(user.value?.email ?? "");
const phone = ref(user.value?.phone ?? "");
const profileValid = ref(false);
const savingProfile = ref(false);

// The session is restored after hydration, so the fields fill when it lands.
watch(user, (next) => {
  fullName.value = next?.full_name ?? "";
  emailAddress.value = next?.email ?? "";
  phone.value = next?.phone ?? "";
});

const onSaveProfile = async () => {
  savingProfile.value = true;

  try {
    await updateProfile({ full_name: fullName.value, phone: phone.value });
    useToast("success", "Your details are saved.");
  } catch (err) {
    useToast(
      "error",
      errorCode(err) && err instanceof Error
        ? err.message
        : "We could not save your details. Try again in a moment.",
    );
  } finally {
    savingProfile.value = false;
  }
};

/* ── Preferences ─────────────────────────────────────────────────────── */

const PREFERENCES = [
  {
    key: "letters",
    label: "Letters from the house",
    description: "New pieces and previews, twice a month",
  },
  {
    key: "restock",
    label: "Restock alerts",
    description: "When a saved piece returns",
  },
  {
    key: "whatsapp",
    label: "WhatsApp updates",
    description: "Order status on WhatsApp",
  },
  { key: "sms", label: "SMS", description: "Delivery day only" },
];

/**
 * TODO(phase-f): these live for the session only. They belong on the profile
 * row once the column exists, written through `updateProfile()`.
 */
const preferences = useState<Record<string, boolean>>("account-preferences", () => ({
  letters: true,
  restock: true,
  whatsapp: false,
  sms: false,
}));

/* ── Leaving ─────────────────────────────────────────────────────────── */

const onSignOut = async () => {
  // Clears the wishlist and returns home.
  await signOut();
  useToast("success", "You are signed out.");
};

usePageSeo({
  title: "Account",
  description: "Your orders, addresses and details.",
  path: "/account",
  robots: "noindex, nofollow",
});
</script>

<style scoped>
.account {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding-block: 24px 64px;
}

.account__head {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.account__title {
  margin: 0;
  font-size: 36px;
  line-height: 1;
}

.account__panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  animation: jbRise var(--dur-reveal) var(--ease-brand) both;
}

.account__stats {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.account__orders {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.account__rows {
  display: flex;
  flex-direction: column;
  margin-top: 4px;
}

.account__row-title {
  font-family: var(--font-display);
  font-size: 18px;
  line-height: 1.2;
}

.account__signout {
  color: var(--text-secondary);
  font-size: 14px;
}

.account__form {
  gap: 22px;
}

.account__save {
  align-self: flex-start;
}

.account__prefs {
  gap: 0;
}

@media (prefers-reduced-motion: reduce) {
  .account__panel {
    animation: none;
  }
}

@media (min-width: 768px) {
  .account__panel {
    max-width: 720px;
  }
}
</style>
