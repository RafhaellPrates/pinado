import { Router } from "express";
import bcrypt from "bcryptjs";
import { rateLimit } from "express-rate-limit";
import { query } from "../db.js";
import { exigirLogin, gerarToken } from "../auth.js";
import { CUSTO_BCRYPT, ErroHttp, cor, h, senhaNova, texto } from "../util.js";

export const conta = Router();

const CAMPOS_USER = "id, nome, email, tema";

// Hash de referência: login com usuário inexistente gasta o mesmo tempo que um existente,
// então o tempo de resposta não revela quais emails têm conta
const HASH_FALSO = bcrypt.hashSync("senha-que-nao-existe", CUSTO_BCRYPT);

// Contra força bruta: 10 tentativas erradas por IP a cada 15 minutos
const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { erro: "Muitas tentativas. Espere 15 minutos e tente de novo" },
});

conta.post(
  "/auth/login",
  limiteLogin,
  h(async (req, res) => {
    const login = texto(req.body?.login, "Email ou nome").toLowerCase();
    const senha = String(req.body?.senha ?? "").slice(0, 72);
    const [u] = await query("SELECT * FROM users WHERE lower(email) = $1 OR lower(nome) = $1 ORDER BY id LIMIT 1", [login]);
    const confere = await bcrypt.compare(senha, u?.senha_hash ?? HASH_FALSO);
    if (!u || !confere) throw new ErroHttp(401, "Login ou senha incorretos");
    res.json({ token: gerarToken(u.id, u.token_versao), user: { id: u.id, nome: u.nome, email: u.email, tema: u.tema } });
  }),
);

conta.use("/me", exigirLogin);

conta.get(
  "/me",
  h(async (req, res) => {
    const [u] = await query(`SELECT ${CAMPOS_USER} FROM users WHERE id = $1`, [req.userId]);
    if (!u) throw new ErroHttp(401, "Usuário não existe mais");
    res.json(u);
  }),
);

conta.put(
  "/me",
  h(async (req, res) => {
    const nome = texto(req.body?.nome, "Nome", 80);
    const email = texto(req.body?.email, "Email", 120).toLowerCase();
    try {
      const [u] = await query(`UPDATE users SET nome = $1, email = $2 WHERE id = $3 RETURNING ${CAMPOS_USER}`, [
        nome,
        email,
        req.userId,
      ]);
      res.json(u);
    } catch (e: any) {
      if (e.code === "23505") throw new ErroHttp(409, "Esse email já está em uso");
      throw e;
    }
  }),
);

conta.put(
  "/me/senha",
  h(async (req, res) => {
    const [u] = await query("SELECT senha_hash FROM users WHERE id = $1", [req.userId]);
    if (!(await bcrypt.compare(String(req.body?.atual ?? ""), u.senha_hash))) {
      throw new ErroHttp(400, "Senha atual incorreta");
    }
    const nova = senhaNova(req.body?.nova);
    // token_versao + 1 derruba as sessões abertas em outros aparelhos; esta recebe token novo
    const [r] = await query(
      "UPDATE users SET senha_hash = $1, token_versao = token_versao + 1 WHERE id = $2 RETURNING token_versao",
      [await bcrypt.hash(nova, CUSTO_BCRYPT), req.userId],
    );
    res.json({ token: gerarToken(req.userId, r.token_versao) });
  }),
);

// tema = { token: "#rrggbb" } ou null pra voltar ao padrão
conta.put(
  "/me/tema",
  h(async (req, res) => {
    const bruto = req.body?.tema;
    let tema: Record<string, string> | null = null;
    if (bruto !== null) {
      if (typeof bruto !== "object" || Array.isArray(bruto)) throw new ErroHttp(400, "Tema inválido");
      const entradas = Object.entries(bruto);
      if (entradas.length > 40) throw new ErroHttp(400, "Tema com tokens demais");
      tema = {};
      for (const [k, v] of entradas) {
        if (!/^[a-zA-Z0-9-]{1,40}$/.test(k)) throw new ErroHttp(400, `Token inválido: ${k}`);
        tema[k] = cor(v);
      }
    }
    const [u] = await query(`UPDATE users SET tema = $1 WHERE id = $2 RETURNING ${CAMPOS_USER}`, [
      tema === null ? null : JSON.stringify(tema),
      req.userId,
    ]);
    res.json(u);
  }),
);
