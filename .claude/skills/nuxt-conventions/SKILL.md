---
name: nuxt-conventions
description: Enforces Nuxt project conventions including directory structure, component patterns, composables, utils, stores, styling, and TypeScript usage. Use when creating, editing, or scaffolding any Nuxt project, Vue component, composable, utility, page, store, layout, or middleware. Use when the user works on a Nuxt or Vue project.
---

# Nuxt Project Conventions

## Directory Structure

```
app/
├── app.vue                     # Root component
├── error.vue                   # Error page
├── assets/css/                 # main.css, colors.css, fonts.css
├── components/                 # Auto-imported, reusable Vue components
├── composables/                # Auto-imported composables (useX pattern)
├── layouts/                    # Page layouts (default.vue, etc.)
├── middleware/                 # Route middleware guards
├── pages/                      # File-based routing
├── plugins/                    # Nuxt plugins
├── store/                      # Pinia stores
└── utils/                      # Reusable utility functions
    ├── types/                  # TypeScript type definitions
    └── constants/              # App constants and static data
```

## Script Setup — ALWAYS

Every `.vue` file MUST use `<script setup lang="ts">`. No exceptions. Never use Options API.

### Auto-Imports — Never Manually Import Vue/Nuxt APIs

`ref`, `reactive`, `computed`, `watch`, `watchEffect`, `onMounted`, `onUnmounted`, `useRouter`, `useRoute`, `useHead`, `useSeoMeta`, `navigateTo`, `definePageMeta`, `storeToRefs` — all auto-imported. Just use them directly.

All composables in `app/composables/` and utils in `app/utils/` are also auto-imported.

**Only use explicit imports for:**
- Type imports: `import type { Product } from "~/utils/types/product"`
- Third-party libraries: `import { useQuery } from "@tanstack/vue-query"`
- Components from subfolders (when needed): `import Step1 from "~/components/Onboarding/Step1.vue"`

## Components (`app/components/`)

- **PascalCase** file names. Prefix base UI components with `App`: `AppButton`, `AppInput`, `AppForm`, `AppImage`
- Group related components in folders: `Home/Guest.vue`, `Onboarding/Step1.vue`
- **Break pages into small, reusable components.** Pages delegate — components do the work.
- Use `<LazyComponentName>` for code-splitting conditionally rendered components.
- Props and emits are **always typed** with `defineProps<T>()` and `defineEmits<T>()`. Use `withDefaults()` for defaults.

### Conditional Rendering — `v-if` vs `v-show`

- **`v-if`/`v-else`**: Condition rarely changes or hidden branch is expensive (heavy components, API calls). Fully removes/creates DOM.
- **`v-show`**: Condition toggles frequently (tabs, dropdowns, modals). Toggles CSS `display` only.

**Rules:**
1. Always pair `v-if` with `v-else` or `v-else-if` — never leave a blank screen.
2. Combine `v-if` + `<Lazy>` prefix for conditional heavy components.
3. Never `v-show` on components that fetch data on mount — use `v-if`.
4. Never `v-if` and `v-for` on the same element — wrap with `<template v-if>`.

### SSR: Use `<ClientOnly>` When Needed

When SSR is enabled (`ssr: true`), wrap components that rely on browser APIs (`window`, `document`, `localStorage`, `navigator`, etc.) in `<ClientOnly>`:

```vue
<ClientOnly>
  <BottomNav />
</ClientOnly>
```

Common cases requiring `<ClientOnly>`:
- Components using `localStorage` or `sessionStorage`
- Components accessing `window` or `document` directly
- Third-party libraries that assume a browser environment (charts, maps, editors)
- Canvas-based components
- Components using `navigator` (clipboard, geolocation)

### Component Template Order

`<template>` → `<script setup lang="ts">` → `<style scoped>`

## Composables (`app/composables/`)

- Prefix with `use`: `useToast.ts`, `useProduct.ts`, `usePaystack.ts`
- Return an object of reactive state and methods.
- Integrate with Pinia stores via `storeToRefs()`.
- **Composable** = needs reactivity, lifecycle hooks, or store access.
- **Util** = pure function, no Vue reactivity — takes input, returns output.

## Utils (`app/utils/`)

- One function per file with **default export**: `goTo.ts`, `copy.ts`, `formatPrice.ts`
- Types in `utils/types/`. Constants in `utils/constants/`.
- Define all shared interfaces/types in `utils/types/` — never inline complex types in components.
- For detailed examples, consult `references/utils-examples.md`.

## Pages (`app/pages/`)

- File-based routing. Keep pages **lean** — delegate to components.
- Use `definePageMeta` for layout and middleware assignment.
- Use `useSeoMeta` or `useHead` for SEO.

## Store (`app/store/`) — Pinia

- **Always** use Composition API (setup) syntax with `defineStore`.
- Use `storeToRefs()` for reactive state, destructure methods directly.
- Persist with `pinia-plugin-persistedstate`.
- For full patterns and examples, consult `references/store-patterns.md`.

## Layouts (`app/layouts/`)

- `default.vue` is the base layout. Create purpose-specific layouts: `navigation.vue`, `admin.vue`, `no-auth.vue`.
- Layouts MUST contain `<slot />`.

## Middleware (`app/middleware/`)

- Use `defineNuxtRouteMiddleware` with `navigateTo` for redirects.
- Apply via `definePageMeta({ middleware: "auth" })`.

## Styling — CRITICAL: No Repeated Styles

1. **Never repeat the same styles across components.** Extract to `main.css` as a reusable class.
2. Use Tailwind utility classes in templates for one-off styles.
3. Use `<style scoped>` for component-specific styles only.
4. Use CSS custom properties (`@theme` block) for colors, spacing, radii — never hardcode values.
5. Use `v-bind()` in `<style>` for dynamic prop-based styles.
6. Custom fonts go in `fonts.css` with `@font-face` declarations.
7. For full styling reference, consult `references/styling-guide.md`.

## Nuxt Config (`nuxt.config.ts`)

Standard stack: `ssr: false`, `components: true`, `typescript: { typeCheck: true }`. Modules: `@pinia/nuxt`, `pinia-plugin-persistedstate/nuxt`. Tailwind v4 via `@tailwindcss/vite` plugin. Add `@vite-pwa/nuxt` only when the user explicitly wants PWA support.

For full config reference, consult `references/nuxt-config.md`.

## Icon System

- Centralized `Icon` component with typed icon names in `utils/types/icons.ts`.
- Or use `nuxt-lucide-icons` module.

## Form System

- `AppForm` provides form context via `provide/inject`.
- `AppInput` registers with parent form for validation.
- Rules defined in `utils/rules.ts`. Track validity with `v-model` on `AppForm`.

## Checklist for New Features

1. Types defined in `utils/types/`?
2. Reusable component created in `components/`?
3. Business logic in a composable (`composables/useX.ts`)?
4. Pure helpers in `utils/`?
5. Page is lean — delegates to components?
6. No repeated styles — reusable classes in `main.css`?
7. Using `<script setup lang="ts">`?
8. Props and emits are typed?

## Common Mistakes to Catch

- Importing `ref`, `computed`, `watch`, `onMounted` from `"vue"` — auto-imported
- Options API usage (`data()`, `methods`, `mounted()`) — always `<script setup>`
- Business logic in pages instead of composables
- Inline complex types instead of `utils/types/`
- Hardcoded colors/radii instead of CSS custom properties from `@theme`
- Repeating styles across components instead of extracting to `main.css`
- Missing `v-else` after `v-if` — always handle the alternative state
- `v-if` and `v-for` on the same element
- `v-show` on components that fetch data on mount
- Forgetting `lang="ts"` on `<script setup>`
- Monolithic components instead of smaller reusable ones
