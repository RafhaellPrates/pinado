import fs from "node:fs";
import path from "node:path";
import { pool } from "./db.js";
import { env } from "./env.js";

const pasta = path.join(env.raiz, "backend", "migrations");

await pool.query(
  "CREATE TABLE IF NOT EXISTS migrations (nome TEXT PRIMARY KEY, aplicada_em TIMESTAMPTZ NOT NULL DEFAULT now())",
);
const feitas = new Set((await pool.query("SELECT nome FROM migrations")).rows.map((r) => r.nome));

for (const arquivo of fs.readdirSync(pasta).filter((f) => f.endsWith(".sql")).sort()) {
  if (feitas.has(arquivo)) continue;
  const sql = fs.readFileSync(path.join(pasta, arquivo), "utf8");
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query(sql);
    await c.query("INSERT INTO migrations (nome) VALUES ($1)", [arquivo]);
    await c.query("COMMIT");
    console.log(`aplicada: ${arquivo}`);
  } catch (e) {
    await c.query("ROLLBACK");
    console.error(`falhou: ${arquivo}`);
    throw e;
  } finally {
    c.release();
  }
}
console.log("migrations em dia");
await pool.end();
