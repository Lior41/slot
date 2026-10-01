import { Pool, type QueryResultRow } from "pg";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { PGlite } from "@electric-sql/pglite";
export interface DbClient {
  query<R extends QueryResultRow = QueryResultRow>(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: R[]; rowCount: number | null }>;
}
const state = globalThis as unknown as { slotPool?: Pool; slotLocal?: Promise<PGlite> };
function native() {
  return (state.slotPool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 8,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
  }));
}
async function local() {
  return (state.slotLocal ??= import("@electric-sql/pglite").then(async ({ PGlite }) => {
    const path = process.env.DB_PATH ?? ".local/embedded";
    await mkdir(dirname(path), { recursive: true });
    return PGlite.create(path);
  }));
}
const localMode = () => process.env.DB_DRIVER === "pglite";
function adapter(engine: Pick<PGlite, "query" | "exec">): DbClient {
  return {
    async query<R extends QueryResultRow>(sql: string, params?: unknown[]) {
      const r = params ? await engine.query<R>(sql, params) : (await engine.exec(sql)).at(-1)!;
      return { rows: r.rows as R[], rowCount: r.rows.length || r.affectedRows || 0 };
    },
  };
}
export const db: DbClient & { end: () => Promise<void> } = {
  async query<R extends QueryResultRow>(sql: string, params?: unknown[]) {
    return localMode()
      ? adapter(await local()).query<R>(sql, params)
      : native().query<R>(sql, params);
  },
  async end() {
    if (localMode()) {
      if (state.slotLocal) await (await state.slotLocal).close();
      state.slotLocal = undefined;
    } else if (state.slotPool) {
      await state.slotPool.end();
      state.slotPool = undefined;
    }
  },
};
export async function transaction<T>(work: (client: DbClient) => Promise<T>) {
  if (localMode()) return (await local()).transaction((t) => work(adapter(t)));
  const client = await native().connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
