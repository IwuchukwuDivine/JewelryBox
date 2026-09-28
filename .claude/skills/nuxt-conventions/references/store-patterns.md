# Pinia Store Patterns

## Setup Store Syntax (Always Use This)

```typescript
import { defineStore } from "pinia"
import type { Toast, User } from "~/utils/types/types"

export const useAppStore = defineStore("app", () => {
  // State
  const toasts = ref<Toast[]>([])
  const user = ref<User | null>(null)

  // Getters (computed)
  const isLoggedIn = computed(() => !!user.value)
  const isAdmin = computed(() => ADMIN_EMAILS.includes(user.value?.email ?? ""))

  // Actions (functions)
  const removeToast = (id: string) => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  return {
    toasts,
    user,
    isLoggedIn,
    isAdmin,
    removeToast,
  }
}, {
  persist: {
    storage: localStorage,
    omit: ["supabase"],  // exclude non-serializable state
  },
})
```

## Cart Store Example

```typescript
import { defineStore } from "pinia"
import type { CartItem } from "~/utils/types/product"

export const useCartStore = defineStore("cart", () => {
  const items = ref<CartItem[]>([])

  const subtotal = computed(() =>
    items.value.reduce((sum, item) => sum + item.price * item.quantity, 0)
  )
  const totalItems = computed(() =>
    items.value.reduce((sum, item) => sum + item.quantity, 0)
  )

  const addItem = (item: CartItem) => {
    const existing = items.value.find((i) => i.id === item.id)
    if (existing) {
      existing.quantity++
    } else {
      items.value.push({ ...item, quantity: 1 })
    }
  }

  const removeItem = (id: number) => {
    items.value = items.value.filter((i) => i.id !== id)
  }

  return { items, subtotal, totalItems, addItem, removeItem }
}, {
  persist: { storage: localStorage },
})
```

## Usage in Composables/Components

```typescript
// Use storeToRefs for reactive state, destructure methods directly
const store = useAppStore()
const { toasts, user, isLoggedIn } = storeToRefs(store) // reactive refs
const { removeToast } = store                            // methods (not reactive)
```

## Aggregator Composable Pattern

Combine multiple stores into a single composable for convenience:

```typescript
// composables/useApp.ts
export const useApp = () => {
  const appStore = useAppStore()
  const cartStore = useCartStore()

  const { user, isLoggedIn, isAdmin } = storeToRefs(appStore)
  const { items: cartItems, subtotal } = storeToRefs(cartStore)
  const { addItem, removeItem } = cartStore

  return {
    user,
    isLoggedIn,
    isAdmin,
    cartItems,
    subtotal,
    addItem,
    removeItem,
  }
}
```
