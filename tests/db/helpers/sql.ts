import { execFileSync, spawnSync } from "node:child_process";

/**
 * Direct SQL against the local Supabase Postgres.
 *
 * Three things need SQL rather than PostgREST, and none of them can be reached
 * through supabase-js:
 *
 *   · catalogue introspection — `pg_class.relrowsecurity`, function privileges;
 *   · role-scoped attempts — `set role authenticated` with a claims payload is
 *     how RLS and the column GRANTs on `orders` get exercised as the role that
 *     matters, without minting JWTs;
 *   · reading a value back as a privileged role after a denied write, which is
 *     the only way to prove RLS denied it. RLS refuses by matching zero rows,
 *     so "did it throw" passes vacuously.
 *
 * There is no `psql` on the host and no `pg` package in the project, so this
 * shells into the stack's own Postgres container. `SUPABASE_DB_CONTAINER`
 * overrides the autodetected name.
 */

const MARKER = "@@JB@@";

const detectContainer = (): string => {
  // No initialiser: the catch below always throws, so a default here is dead
  // and eslint flags it. TS still sees `out` as definitely assigned after
  // the try/catch.
  let out: string;
  try {
    out = execFileSync(
      "docker",
      ["ps", "--filter", "name=supabase_db", "--format", "{{.Names}}"],
      { encoding: "utf8" },
    );
  } catch {
    throw new Error(
      "docker is not reachable, so the DB suite cannot talk to Postgres. Start Docker and the local stack, then re-run.",
    );
  }
  const name = out
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)[0];
  if (!name) {
    throw new Error(
      "No running supabase_db_* container. Start the local stack before running the DB suite (the shared instance is deliberately not reset by these tests).",
    );
  }
  return name;
};

let container: string | undefined;

const dbContainer = (): string =>
  (container ??= process.env.SUPABASE_DB_CONTAINER ?? detectContainer());

/** Postgres string literal. `standard_conforming_strings` is on, so doubling is enough. */
export const lit = (value: string): string => `'${value.replace(/'/g, "''")}'`;

export type DbRole = "anon" | "authenticated" | "service_role";

export interface RoleContext {
  /** Omit to stay `postgres`, which bypasses RLS and every column GRANT. */
  role?: DbRole;
  /** What `auth.uid()` should return. */
  userId?: string | null;
}

/**
 * `set role` plus the JWT claims Supabase's `auth.uid()` reads, which is what
 * PostgREST itself does per request. Each invocation is a fresh session, so
 * nothing leaks between calls and no reset is needed.
 */
const preamble = (ctx: RoleContext): string => {
  if (!ctx.role) return "";
  const claims = JSON.stringify({ sub: ctx.userId ?? null, role: ctx.role });
  return `select set_config('request.jwt.claims', ${lit(claims)}, false);\nset role ${ctx.role};\n`;
};

const run = (script: string): string => {
  const result = spawnSync(
    "docker",
    [
      "exec",
      "-i",
      dbContainer(),
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-X",
      "-q",
      "-A",
      "-t",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    { input: script, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`SQL failed:\n${script}\n\n${result.stderr.trim()}`);
  }
  return result.stdout;
};

const marked = (stdout: string): string => {
  const line = stdout
    .split("\n")
    .reverse()
    .find((l) => l.startsWith(MARKER));
  if (line === undefined) {
    throw new Error(`No result line in psql output:\n${stdout}`);
  }
  return line.slice(MARKER.length);
};

/** Run statements for effect. Any error aborts and throws. */
export const execSql = (sql: string, ctx: RoleContext = {}): void => {
  run(preamble(ctx) + sql);
};

/** Rows of a SELECT, as JSON. `sql` is a full query without a trailing semicolon. */
export const rows = <T = Record<string, unknown>>(
  sql: string,
  ctx: RoleContext = {},
): T[] => {
  const body = sql.trim().replace(/;$/, "");
  const script = `${preamble(ctx)}select ${lit(MARKER)} || coalesce(jsonb_agg(to_jsonb(t))::text, '[]') from (${body}) t;`;
  return JSON.parse(marked(run(script))) as T[];
};

/** Exactly one row, or an error. */
export const one = <T = Record<string, unknown>>(
  sql: string,
  ctx: RoleContext = {},
): T => {
  const result = rows<T>(sql, ctx);
  if (result.length !== 1) {
    throw new Error(`Expected exactly 1 row, got ${result.length}:\n${sql}`);
  }
  return result[0]!;
};

/** A single value. */
export const scalar = <T>(expression: string, ctx: RoleContext = {}): T =>
  one<{ v: T }>(`select (${expression}) as v`, ctx).v;

export interface Attempt {
  ok: boolean;
  /** The machine code from `raise … using hint`. `null` when nothing raised. */
  hint: string | null;
  sqlstate: string | null;
  message: string | null;
  /**
   * Rows the statement actually touched. `ok: true, rows: 0` is what an RLS
   * denial looks like — it is not an error, which is exactly why a bare
   * "did it throw" assertion is worthless here.
   */
  rows: number;
}

/**
 * Run one statement and capture how it failed, structurally.
 *
 * The helper lives in `pg_temp`, so it vanishes with the session and adds
 * nothing to the shared schema. `execute` inside a plpgsql block runs under an
 * implicit savepoint, so a caught failure leaves no trace.
 */
export const attempt = (sql: string, ctx: RoleContext = {}): Attempt => {
  const helper = `
create function pg_temp.jb_try(p_sql text) returns jsonb
language plpgsql as $jbtry$
declare v_hint text; v_state text; v_msg text; v_rows bigint;
begin
  execute p_sql;
  get diagnostics v_rows = row_count;
  return jsonb_build_object('ok', true, 'rows', v_rows);
exception when others then
  get stacked diagnostics
    v_hint  = pg_exception_hint,
    v_state = returned_sqlstate,
    v_msg   = message_text;
  return jsonb_build_object(
    'ok', false, 'rows', 0,
    'hint', nullif(v_hint, ''), 'sqlstate', v_state, 'message', v_msg);
end
$jbtry$;
`;
  const script = `${helper}${preamble(ctx)}select ${lit(MARKER)} || pg_temp.jb_try(${lit(sql.trim().replace(/;$/, ""))})::text;`;
  const raw = JSON.parse(marked(run(script))) as Partial<Attempt>;
  return {
    ok: raw.ok === true,
    hint: raw.hint ?? null,
    sqlstate: raw.sqlstate ?? null,
    message: raw.message ?? null,
    rows: Number(raw.rows ?? 0),
  };
};
