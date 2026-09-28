<template>
  <section class="luxe-card btc" aria-label="Bank transfer details">
    <div class="btc__reference">
      <p class="eyebrow">Transfer reference</p>

      <div class="btc__reference-row">
        <p class="btc__number">{{ order.order_number }}</p>

        <button
          type="button"
          class="icon-btn btc__copy"
          aria-label="Copy transfer reference"
          @click="copyReference"
        >
          <lucide-copy :size="15" :stroke-width="1.5" />
        </button>
      </div>

      <p class="btc__note">
        Use this exactly as the narration on your transfer. It is how we match
        your payment to your piece.
      </p>
    </div>

    <dl class="btc__rows">
      <div class="btc__row">
        <dt>Bank</dt>
        <dd>{{ BANK.bank_name }}</dd>
      </div>

      <div class="btc__row">
        <dt>Account number</dt>
        <dd class="btc__account">
          <span class="price">{{ BANK.account_number }}</span>
          <button
            type="button"
            class="icon-btn btc__copy"
            aria-label="Copy account number"
            @click="copyAccount"
          >
            <lucide-copy :size="14" :stroke-width="1.5" />
          </button>
        </dd>
      </div>

      <div class="btc__row">
        <dt>Account name</dt>
        <dd>{{ BANK.account_name }}</dd>
      </div>

      <!-- Unpriced: "Amount (items)", and no total anywhere — the same
           wording as the order email, which the customer is holding. -->
      <div class="btc__row btc__row--amount">
        <dt>{{ unpriced ? "Amount (items)" : "Amount" }}</dt>
        <dd class="price btc__amount">{{ formatPrice(amount) }}</dd>
      </div>
    </dl>

    <p v-if="unpriced" class="btc__note">
      Delivery to {{ order.delivery_destination }} is not priced yet. Transfer
      the item amount above; we will write with the delivery fee before your
      piece travels.
    </p>

    <p class="btc__note">
      Your piece is reserved the moment we see the transfer, and we will write
      to confirm it.
    </p>
  </section>
</template>

<script setup lang="ts">
import type { Order } from "~/utils/types/shop";

/**
 * Where to send the money, and what to write on it.
 *
 * The order number IS the transfer reference — there is no separate payment
 * id anywhere in this system, and an admin matches an incoming transfer to an
 * order by that narration alone. Hence the copy button on it.
 */
const props = defineProps<{ order: Order }>();

/*
 * TODO(launch): these are placeholders. The real account belongs in
 * `site_settings.bank_account` (private, admin-writable), which is where
 * `server/utils/orderEmails.ts` already reads its `BankDetails` from — the
 * page and the email must never be able to disagree about an account number.
 */
const BANK = {
  bank_name: "Guaranty Trust Bank",
  account_number: "0000000000",
  account_name: "JewelryBox Limited",
} as const;

const unpriced = computed(() => props.order.delivery_fee_ngn === null);

/**
 * What to transfer. Never `total_ngn` on an unpriced order: that column is
 * `subtotal + coalesce(fee, 0)`, so printing it would quote a figure that is
 * silently missing the delivery line.
 */
const amount = computed(() =>
  unpriced.value ? props.order.subtotal_ngn : props.order.total_ngn,
);

const copyReference = () => {
  void copy(props.order.order_number, "Transfer reference copied.");
};

const copyAccount = () => {
  void copy(BANK.account_number, "Account number copied.");
};
</script>

<style scoped>
.btc {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 20px;
}

.btc__reference {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btc__reference-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.btc__number {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 22px;
  line-height: 1.2;
  font-weight: 500;
  letter-spacing: 0.1em;
  color: var(--accent);
}

.btc__copy {
  flex: 0 0 auto;
}

.btc__rows {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin: 0;
  padding-top: 4px;
  border-top: 1px solid var(--border-default);
}

.btc__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 8px 0;
  font-size: 13px;
}

.btc__row dt {
  margin: 0;
  color: var(--text-muted);
  white-space: nowrap;
}

.btc__row dd {
  margin: 0;
  text-align: right;
  color: var(--text-primary);
}

.btc__account {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btc__row--amount {
  border-top: 1px solid var(--border-default);
}

.btc__amount {
  font-size: 16px;
}

.btc__note {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-muted);
}
</style>
