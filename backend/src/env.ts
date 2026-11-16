import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";

// backend/src ou backend/dist -> raiz do repo
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
config({ path: path.join(raiz, ".env"), quiet: true });

function exigir(nome: string): string {
  const valor = process.env[nome];
  if (!valor) throw new Error(`Variável ${nome} não definida no .env`);
  return valor;
}

const jwtSecret = exigir("JWT_SECRET");
if (jwtSecret.length < 32 || jwtSecret.startsWith("troque")) {
  throw new Error("JWT_SECRET fraco: use 32 caracteres ou mais, gerados aleatoriamente");
}

export const env = {
  raiz,
  databaseUrl: exigir("DATABASE_URL"),
  jwtSecret,
  port: Number(process.env.PORT ?? 3001),
  producao: process.env.NODE_ENV === "production",
};
