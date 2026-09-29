import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Clients for the local stack.
 *
 * Keys come from `.env` through vitest's `env` option (see `vitest.config.ts`).
 * Nothing here is hardcoded: `supabase start` regenerates them, and a suite
 * carrying a stale copy fails in a way that looks like a schema bug.
 */

const need = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. The DB suite reads it from .env — run \`npx supabase status\` and refresh the file.`,
    );
  }
  return value;
};

const options = {
  auth: { autoRefreshToken: false, persistSession: false },
} as const;

let serviceClient: SupabaseClient | undefined;

/** Service role: bypasses RLS. Fixture setup, teardown and guest RPC calls. */
export const service = (): SupabaseClient =>
  (serviceClient ??= createClient(
    need("SUPABASE_URL"),
    need("SUPABASE_SERVICE_ROLE_KEY"),
    options,
  ));

/** A fresh anon client. One per signed-in identity, so sessions cannot bleed. */
export const anonClient = (): SupabaseClient =>
  createClient(need("SUPABASE_URL"), need("SUPABASE_ANON_KEY"), options);

export interface RpcFailure {
  code: string | null;
  /** The machine code the schema raises. Never assert on `message`. */
  hint: string | null;
  message: string;
}

/** Narrow a PostgREST error down to the structured fields worth asserting on. */
export const rpcError = (error: unknown): RpcFailure => {
  const e = (error ?? {}) as Record<string, unknown>;
  return {
    code: typeof e.code === "string" ? e.code : null,
    hint: typeof e.hint === "string" && e.hint !== "" ? e.hint : null,
    message: typeof e.message === "string" ? e.message : "",
  };
};
