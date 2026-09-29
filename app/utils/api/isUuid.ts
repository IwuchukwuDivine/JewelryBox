const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Whether a string can be a Postgres uuid.
 *
 * Load-bearing at the seam: product ids were `prd_001` against the fixtures and
 * are uuids against the database, so a wishlist or cart persisted before Phase F
 * carries ids no `uuid` column can be compared against. PostgREST answers a
 * malformed uuid with a 22P02 error rather than an empty set, which would turn a
 * stale localStorage entry into a broken page — so those ids are filtered out
 * before they reach a query.
 */
export default (value: string): boolean => UUID_RE.test(value);
