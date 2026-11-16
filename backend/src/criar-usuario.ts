import readline from "node:readline";
import bcrypt from "bcryptjs";
import { pool, transacao } from "./db.js";
import { GRUPOS_PADRAO } from "./seed.js";
import { CUSTO_BCRYPT, senhaNova } from "./util.js";

// Fila de linhas: funciona digitando ou com stdin vindo de pipe
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const linhas: string[] = [];
const esperando: ((l: string) => void)[] = [];
rl.on("line", (l) => (esperando.length ? esperando.shift()!(l) : linhas.push(l)));
rl.on("close", () => esperando.splice(0).forEach((r) => r("")));
const pergunta = (texto: string) =>
  new Promise<string>((resolve) => {
    process.stdout.write(texto);
    linhas.length ? resolve(linhas.shift()!) : esperando.push(resolve);
  });

// Cria usuário (com os grupos padrão) ou redefine a senha se o email já existe
const email = (await pergunta("Email: ")).trim().toLowerCase();
const existente = (await pool.query("SELECT id, nome FROM users WHERE email = $1", [email])).rows[0];

if (existente) {
  const senha = senhaNova(await pergunta(`Usuário ${existente.nome} já existe. Nova senha: `));
  // Redefinir também derruba as sessões abertas
  await pool.query("UPDATE users SET senha_hash = $1, token_versao = token_versao + 1 WHERE id = $2", [
    await bcrypt.hash(senha, CUSTO_BCRYPT),
    existente.id,
  ]);
  console.log("Senha redefinida e sessões encerradas");
} else {
  const nome = (await pergunta("Nome: ")).trim();
  if (!nome) throw new Error("Nome obrigatório");
  const senha = senhaNova(await pergunta("Senha: "));
  await transacao(async (c) => {
    const u = (
      await c.query("INSERT INTO users (nome, email, senha_hash) VALUES ($1,$2,$3) RETURNING id", [
        nome,
        email,
        await bcrypt.hash(senha, CUSTO_BCRYPT),
      ])
    ).rows[0];
    for (const [i, g] of GRUPOS_PADRAO.entries()) {
      await c.query("INSERT INTO grupos (user_id, nome, posicao) VALUES ($1,$2,$3)", [u.id, g, i]);
    }
  });
  console.log(`Usuário ${nome} criado com os grupos ${GRUPOS_PADRAO.join(" e ")}`);
}
rl.close();
await pool.end();
