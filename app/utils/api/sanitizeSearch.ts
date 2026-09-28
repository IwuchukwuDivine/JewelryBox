/**
 * Makes a search box safe to interpolate into a PostgREST `or=(…)` filter.
 *
 * Two separate problems, both of them user-reachable:
 *
 *   · `%`, `_` and `\` are LIKE metacharacters, and `*` is PostgREST's own
 *     wildcard. Left alone, a customer typing "50%" matches every product.
 *     The first three can be escaped; `*` cannot, so it is dropped.
 *   · `(`, `)`, `,` and quotes are the *syntax* of `or=(…)`. A stray comma
 *     splits one condition into two and a stray parenthesis makes PostgREST
 *     answer 400 — a broken search page, not an empty one.
 *
 * `.` and `:` are deliberately left alone. PostgREST splits an `or=(…)` member
 * on its first two dots (column, operator, then the rest is the value), so a
 * dot inside the value is fine — and stripping it breaks the admin order
 * search, where the thing being typed is usually an email address.
 *
 * Returns "" when nothing usable is left, which callers treat as "no search".
 */
export default (raw: string): string =>
  raw
    .replace(/[\\%_]/g, (match) => `\\${match}`)
    .replace(/[(),"'*]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
