/**
 * v-reveal — 24px rise + fade, staggered 80ms per line.
 *
 * Registered universally, but it only ever does anything in the browser:
 * `mounted` does not run during SSR, so server-rendered markup ships visible
 * to crawlers and to anyone without JS. Registration has to happen on the
 * server too, or every SSR render warns `Failed to resolve directive: reveal`.
 *
 *   <div v-reveal />          → reveals on first intersection
 *   <div v-reveal="2" />      → same, delayed 2 × 80ms
 *   <li v-for="…" v-reveal="i" />
 *
 * Motion values come from main.css (--dur-reveal, --ease-brand); the
 * prefers-reduced-motion block lands .jb-reveal outright.
 */

const STAGGER_MS = 80;

export default defineNuxtPlugin((nuxtApp) => {
  const observers = new WeakMap<HTMLElement, IntersectionObserver>();

  const reveal = (el: HTMLElement) => {
    el.classList.add("jb-reveal--in");
    observers.get(el)?.disconnect();
    observers.delete(el);
  };

  nuxtApp.vueApp.directive<HTMLElement, number | undefined>("reveal", {
    mounted(el, binding) {
      const delay = (Number(binding.value) || 0) * STAGGER_MS;
      el.style.transitionDelay = delay ? `${delay}ms` : "";

      // No IntersectionObserver (old browser, jsdom) — show it and move on.
      if (typeof IntersectionObserver === "undefined") return;

      el.classList.add("jb-reveal");

      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) reveal(el);
          }
        },
        { rootMargin: "0px 0px -10% 0px", threshold: 0.01 },
      );

      observers.set(el, observer);
      observer.observe(el);
    },

    unmounted(el) {
      observers.get(el)?.disconnect();
      observers.delete(el);
    },

    // Nothing to contribute to the server-rendered markup — declared so Vue
    // treats this as SSR-aware rather than warning about it.
    getSSRProps: () => ({}),
  });
});
