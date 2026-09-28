# Styling Guide

## Global CSS Structure (`app/assets/css/main.css`)

```css
@import "tailwindcss";

/* ===== Theme Variables ===== */
@theme {
  --color-background: #f6f4ff;
  --color-primary: #6b45ff;
  --color-secondary: #ff6b8a;
  --color-text: #1a1a2e;
  --color-text-light: #6b7280;
  --color-border: #e5e7eb;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-full: 9999px;
}

/* ===== Global Resets ===== */
* {
  -webkit-tap-highlight-color: transparent;
}

html {
  scroll-behavior: smooth;
}

body {
  font-family: "AppFont", sans-serif;
  background-color: var(--color-background);
  color: var(--color-text);
  user-select: none;
  min-height: 100dvh;
}

/* Hide scrollbar */
::-webkit-scrollbar {
  display: none;
}
* {
  scrollbar-width: none;
}

/* ===== Reusable Button Classes ===== */
.btn-primary {
  background-color: var(--color-primary);
  color: #fff;
  padding: 0.875rem 1.5rem;
  border-radius: var(--radius-sm);
  font-weight: 500;
  transition: all 0.2s;
}

.btn-secondary {
  background-color: var(--color-secondary);
  color: #fff;
  padding: 0.875rem 1.5rem;
  border-radius: var(--radius-sm);
  font-weight: 500;
  transition: all 0.2s;
}

.btn-outlined {
  border: 1.5px solid var(--color-primary);
  color: var(--color-primary);
  padding: 0.875rem 1.5rem;
  border-radius: var(--radius-sm);
  font-weight: 500;
  background: transparent;
  transition: all 0.2s;
}

/* ===== Reusable Layout Classes ===== */
.card {
  background: #fff;
  border-radius: var(--radius-md);
  padding: 1rem;
}

.page-container {
  max-width: 430px;
  margin: 0 auto;
  min-height: 100dvh;
}

/* ===== Safe Area Handling (iOS PWA) ===== */
.safe-padding-top {
  padding-top: clamp(0px, env(safe-area-inset-top, 0px), 32px);
}

.safe-padding-bottom {
  padding-bottom: clamp(0px, env(safe-area-inset-bottom, 0px), 32px);
}
```

## Font Setup (`app/assets/css/fonts.css`)

```css
@font-face {
  font-family: "AppFont";
  src: url("~/assets/fonts/Font-Light.ttf") format("truetype");
  font-weight: 300;
}

@font-face {
  font-family: "AppFont";
  src: url("~/assets/fonts/Font-Regular.ttf") format("truetype");
  font-weight: 400;
}

@font-face {
  font-family: "AppFont";
  src: url("~/assets/fonts/Font-Medium.ttf") format("truetype");
  font-weight: 500;
}

@font-face {
  font-family: "AppFont";
  src: url("~/assets/fonts/Font-SemiBold.ttf") format("truetype");
  font-weight: 600;
}

@font-face {
  font-family: "AppFont";
  src: url("~/assets/fonts/Font-Bold.ttf") format("truetype");
  font-weight: 700;
}
```

## Dynamic Styles with `v-bind()`

```vue
<script setup lang="ts">
const props = defineProps<{
  rounded?: string
  color?: string
}>()
</script>

<style scoped>
.element {
  border-radius: v-bind(rounded);
  color: v-bind(color);
}
</style>
```

## Dark Mode Pattern (via CSS variables)

```css
/* In colors.css */
.dark {
  --color-background: #0f0f0f;
  --color-text: #f5f5f5;
  --color-border: #2a2a2a;
}
```

## Theme System Pattern (multiple themes)

```css
.theme-default {
  --color-primary: #6b45ff;
  --color-background: #f6f4ff;
}

.theme-ocean {
  --color-primary: #0077b6;
  --color-background: #caf0f8;
}
```

Apply theme class to `<body>` or root element. Store selection in Pinia with persistence.
