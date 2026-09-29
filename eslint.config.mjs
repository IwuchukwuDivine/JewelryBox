// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    // Props are declared with type-only `defineProps<T>()`. For an optional
    // prop, `undefined` IS the intended default — Vue documents it as such,
    // and components branch on it (`v-if="icon"`, `error ?? validationError`).
    // Padding every optional prop with `: undefined` in `withDefaults` to
    // satisfy this rule adds noise and fights the type declaration, so it is
    // off. `withDefaults` is still used wherever a real default exists.
    'vue/require-default-prop': 'off',
  },
})
