# Utils, Types & Validation Examples

## Common Utility Functions

```typescript
// goTo.ts — Navigation helper
export default (path: string) => {
  const router = useRouter()
  router.push(path)
}

// goBack.ts — Browser back
export default () => {
  const router = useRouter()
  router.back()
}

// replace.ts — Router replace (no history entry)
export default (path: string) => {
  const router = useRouter()
  router.replace(path)
}

// copy.ts — Clipboard
export default async (text: string) => {
  await navigator.clipboard.writeText(text)
}

// formatPrice.ts — Currency formatting
export default (price: number) => {
  return price.toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
  })
}

// helpers.ts — General helpers
export const uuid = () => crypto.randomUUID()

// log.ts — Dev-only logging
export default (...args: unknown[]) => {
  if (import.meta.dev) console.log(...args)
}

// scrollToTop.ts
export default () => {
  window.scrollTo({ top: 0, behavior: "smooth" })
}
```

## Type Definitions (`utils/types/`)

### Product Types
```typescript
// utils/types/product.ts
export interface Product {
  id: number
  name: string
  price: number
  image: string
  images?: string[]
  category: string
  description?: string
  inStock: boolean
}

export interface CartItem extends Product {
  quantity: number
}
```

### General Types
```typescript
// utils/types/types.d.ts
export type Toast = {
  id: string
  type: "success" | "error" | "warning" | "info"
  message: string
}

export type User = {
  id: string
  email: string
  name: string
  avatar?: string
}

export type BtnVariant = "primary" | "secondary" | "outlined" | "ghost"
```

## Validation Rules

```typescript
// utils/rules.ts
export type Rule = {
  rule: (value: string | number) => boolean
  message: string
}

export const emailRules: Rule[] = [
  { rule: (v) => !!v, message: "Email is required" },
  { rule: (v) => /.+@.+\..+/.test(String(v)), message: "Invalid email" },
]

export const passwordRules: Rule[] = [
  { rule: (v) => !!v, message: "Password is required" },
  { rule: (v) => String(v).length >= 8, message: "Must be at least 8 characters" },
]

export const requiredRule = (label: string): Rule[] => [
  { rule: (v) => !!v, message: `${label} is required` },
]
```

## Constants (`utils/constants/`)

```typescript
// utils/constants/app.ts
export const APP_NAME = "MyApp"
export const ADMIN_EMAILS = ["admin@example.com"]

export const SORT_OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
] as const
```
