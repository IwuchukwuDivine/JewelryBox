/**
 * Rate limiting for Nitro routes.
 *
 * A thin wrapper over the `check_rate_limit(p_key, p_limit, p_window)` RPC —
 * one atomic upsert in Postgres, never a read-then-write, and never an
 * in-memory counter. The app deploys to Vercel serverless where every request
 * may land on a fresh instance, so a module-level `Map` would be theatre.
 *
 * ── Why the service client ───────────────────────────────────────────────
 * The migration ends with
 *
 *   revoke execute on function public.check_rate_limit(text, int, interval)
 *     from public, anon, authenticated;
 *
 * so the anon key cannot spend (or exhaust) the budget. Definer functions that
 * call it internally — `place_order`, `lookup_order` — run as the owner and are
 * unaffected. A Nitro route calling it directly therefore has exactly one way
 * in: the service role. `serverSupabase()` here would fail with a permission
 * error on every call, which `rateLimit()` would correctly report as a refusal
 * and which would then look like a working limiter that blocks everyone.
 *
 * ── Fail closed ──────────────────────────────────────────────────────────
 * Any failure — RPC error, thrown client construction, a null return — is a
 * refusal. The alternative, failing open, turns a database blip into an open
 * relay for the email routes this guards. Every refusal-by-failure is logged so
 * a misconfiguration is visible rather than silently rejecting real customers.
 */

import type { H3Event } from "h3";

/**
 * The namespace of a key, for logs — `contact:email:ada@example.com` becomes
 * `contact:email`. Keys carry an email address or an IP, and neither belongs in
 * a log line when the bucket name is what makes the entry diagnosable.
 */
const bucketOf = (key: string): string =>
  key.split(":").slice(0, 2).join(":") || "(empty)";

/**
 * Spend one unit of `key`'s budget. `true` means the caller may proceed.
 *
 * `window` is a Postgres interval literal — `"1 hour"`, `"15 minutes"`.
 * Prefer a namespaced key (`notify:ip:…`, `contact:email:…`) so two features
 * can never share a bucket; the RPC truncates at 200 characters.
 */
export const rateLimit = async (
  key: string,
  limit: number,
  window: string,
): Promise<boolean> => {
  try {
    const { data, error } = await serviceSupabase().rpc("check_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window: window,
    });

    if (error) {
      console.error(
        `[rateLimit] check_rate_limit failed for ${bucketOf(key)}: ${error.message}`,
      );
      return false;
    }

    // Anything but an explicit true is a refusal: a null return means the RPC
    // answered something we do not understand, which is not permission.
    return data === true;
  } catch (err) {
    console.error(
      `[rateLimit] could not reach check_rate_limit for ${bucketOf(key)}:`,
      err instanceof Error ? err.message : err,
    );
    return false;
  }
};

/**
 * The real client IP.
 *
 * `x-forwarded-for` is a comma-separated chain, appended to by each proxy it
 * passes through: `<client>, <proxy1>, <proxy2>`. Vercel appends, so the LAST
 * entry is the edge and the FIRST is the client. A single-value read of the
 * header — `getRequestHeader(event, "x-forwarded-for")` used as-is — therefore
 * yields the whole chain as one string, and keying a rate limit on it gives an
 * attacker a fresh bucket for every fake hop they prepend. Take the first
 * entry, then fall back to `x-real-ip` and finally the socket address (which is
 * correct in local dev, where there is no proxy at all).
 *
 * Node joins repeated headers of this name with ", " before we see them, so
 * splitting on "," covers both a single header and several. The array branch is
 * there because the type permits it.
 *
 * The value is spoofable by anyone who can set the header when the deployment
 * is not behind a proxy that overwrites it — which is why the IP limit is
 * always one of several controls (the notify route also limits per order; the
 * contact route also limits per email address) and never the only one.
 */
export const clientIp = (event: H3Event): string => {
  const raw = event.node.req.headers["x-forwarded-for"];
  const chain = Array.isArray(raw) ? raw[0] : raw;
  const first = chain?.split(",")[0]?.trim();
  if (first) return first;

  const realIp = event.node.req.headers["x-real-ip"];
  const real = (Array.isArray(realIp) ? realIp[0] : realIp)?.trim();
  if (real) return real;

  return event.node.req.socket?.remoteAddress || "unknown";
};
