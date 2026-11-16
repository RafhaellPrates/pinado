import pg from "pg";
import { env } from "./env.js";

const local = /localhost|127\.0\.0\.1/.test(env.databaseUrl);

export const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  ssl: local ? false : { rejectUnauthorized: false },
});

export async function query<T extends pg.QueryResultRow = any>(sql: string, params: unknown[] = []) {
  const r = await pool.query<T>(sql, params);
  return r.rows;
}

export async function transacao<T>(fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const r = await fn(c);
    await c.query("COMMIT");
    return r;
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}
