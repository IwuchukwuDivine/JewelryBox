import { useColorMode } from "@vueuse/core";

/**
 * Light / dark switching.
 *
 * **Light is the default.** The OS preference is deliberately not consulted:
 * a first-time visitor always gets ivory, and dark is an explicit choice that
 * is then persisted and wins from then on.
 *
 * Three pieces have to agree or the page flashes on load: the `dark` custom
 * variant in main.css, this composable, and the critical inline script in
 * nuxt.config.ts — all keyed on `jb-theme`.
 */
export const THEME_STORAGE_KEY = "jb-theme";

export default () => {
  const mode = useColorMode({
    selector: "html",
    attribute: "class",
    modes: { light: "", dark: "dark" },
    initialValue: "light",
    storageKey: THEME_STORAGE_KEY,
  });

  const isDark = computed(() => mode.value === "dark");

  /** Explicit choice — never returns to `auto` once the visitor has picked. */
  const toggle = () => {
    mode.value = mode.value === "dark" ? "light" : "dark";
  };

  return { mode, isDark, toggle };
};
