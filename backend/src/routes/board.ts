import { Router } from "express";
import { generateKeyBetween } from "fractional-indexing";
import { query } from "../db.js";
import { ErroHttp, cor, h, id, naoEncontrado, prioridade, texto, textoOpcional } from "../util.js";

export const board = Router();

const CAMPOS_CARD = "id, coluna_id, titulo, descricao, cor, prioridade, posicao, criado_em, atualizado_em";

async function projetoDoUsuario(projetoId: number, userId: number) {
  const [p] = await query("SELECT id, grupo_id, nome, descricao, arquivado FROM projetos WHERE id = $1 AND user_id = $2", [
    projetoId,
    userId,
  ]);
  if (!p) naoEncontrado();
  return p;
}

async function colunaDoUsuario(colunaId: number, userId: number) {
  const [c] = await query(
    `SELECT col.id, col.projeto_id FROM colunas col JOIN projetos p ON p.id = col.projeto_id
      WHERE col.id = $1 AND p.user_id = $2`,
    [colunaId, userId],
  );
  if (!c) naoEncontrado();
  return c;
}

async function cardDoUsuario(cardId: number, userId: number) {
  const [c] = await query(
    `SELECT c.id, c.projeto_id, c.coluna_id FROM cards c JOIN projetos p ON p.id = c.projeto_id
      WHERE c.id = $1 AND p.user_id = $2`,
    [cardId, userId],
  );
  if (!c) naoEncontrado();
  return c;
}

board.get(
  "/projetos/:id/board",
  h(async (req, res) => {
    const projeto = await projetoDoUsuario(id(req.params.id), req.userId);
    const colunas = await query("SELECT id, nome, status, cor, posicao FROM colunas WHERE projeto_id = $1 ORDER BY posicao", [
      projeto.id,
    ]);
    const cards = await query(`SELECT ${CAMPOS_CARD} FROM cards WHERE projeto_id = $1 ORDER BY posicao`, [projeto.id]);
    res.json({ projeto, colunas, cards });
  }),
);

board.put(
  "/colunas/:id",
  h(async (req, res) => {
    const col = await colunaDoUsuario(id(req.params.id), req.userId);
    const b = req.body ?? {};
    const [c] = await query(
      `UPDATE colunas SET nome = coalesce($1, nome), cor = coalesce($2, cor) WHERE id = $3
       RETURNING id, nome, status, cor, posicao`,
      [b.nome !== undefined ? texto(b.nome, "Nome", 40) : null, b.cor !== undefined ? cor(b.cor) : null, col.id],
    );
    res.json(c);
  }),
);

// Novo card entra no fim da coluna
board.post(
  "/cards",
  h(async (req, res) => {
    const col = await colunaDoUsuario(id(req.body?.coluna_id), req.userId);
    const b = req.body;
    const [ultimo] = await query("SELECT posicao FROM cards WHERE coluna_id = $1 ORDER BY posicao DESC LIMIT 1", [
      col.id,
    ]);
    const [c] = await query(
      `INSERT INTO cards (projeto_id, coluna_id, titulo, descricao, cor, prioridade, posicao)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING ${CAMPOS_CARD}`,
      [
        col.projeto_id,
        col.id,
        texto(b.titulo, "Título", 200),
        textoOpcional(b.descricao, "Descrição"),
        b.cor !== undefined ? cor(b.cor) : "#fde68a",
        b.prioridade !== undefined ? prioridade(b.prioridade) : 3,
        generateKeyBetween(ultimo?.posicao ?? null, null),
      ],
    );
    res.status(201).json(c);
  }),
);

board.put(
  "/cards/:id",
  h(async (req, res) => {
    const card = await cardDoUsuario(id(req.params.id), req.userId);
    const b = req.body ?? {};
    const [c] = await query(
      `UPDATE cards SET titulo = coalesce($1, titulo), descricao = coalesce($2, descricao),
              cor = coalesce($3, cor), prioridade = coalesce($4, prioridade), atualizado_em = now()
        WHERE id = $5 RETURNING ${CAMPOS_CARD}`,
      [
        b.titulo !== undefined ? texto(b.titulo, "Título", 200) : null,
        b.descricao !== undefined ? textoOpcional(b.descricao, "Descrição") : null,
        b.cor !== undefined ? cor(b.cor) : null,
        b.prioridade !== undefined ? prioridade(b.prioridade) : null,
        card.id,
      ],
    );
    res.json(c);
  }),
);

// Move o card pra coluna_id, entre os cards antes_id e depois_id (null = ponta da lista).
// Grava só a linha movida: a nova posição é uma chave entre as dos vizinhos.
board.put(
  "/cards/:id/mover",
  h(async (req, res) => {
    const card = await cardDoUsuario(id(req.params.id), req.userId);
    const col = await colunaDoUsuario(id(req.body?.coluna_id), req.userId);
    if (col.projeto_id !== card.projeto_id) throw new ErroHttp(400, "Coluna de outro projeto");

    async function posicaoVizinho(v: unknown) {
      if (v === null || v === undefined) return null;
      const [r] = await query("SELECT posicao FROM cards WHERE id = $1 AND coluna_id = $2 AND id <> $3", [
        id(v),
        col.id,
        card.id,
      ]);
      if (!r) throw new ErroHttp(409, "O quadro mudou, recarregue");
      return r.posicao as string;
    }
    let antes = await posicaoVizinho(req.body?.antes_id);
    let depois = await posicaoVizinho(req.body?.depois_id);

    // Sem vizinho informado num lado: encosta no card mais próximo daquele lado
    if (antes === null && depois === null) {
      const [ultimo] = await query(
        "SELECT posicao FROM cards WHERE coluna_id = $1 AND id <> $2 ORDER BY posicao DESC LIMIT 1",
        [col.id, card.id],
      );
      antes = ultimo?.posicao ?? null;
    }
    if (antes !== null && depois !== null && antes >= depois) throw new ErroHttp(409, "O quadro mudou, recarregue");

    const [c] = await query(
      `UPDATE cards SET coluna_id = $1, posicao = $2, atualizado_em = now() WHERE id = $3 RETURNING ${CAMPOS_CARD}`,
      [col.id, generateKeyBetween(antes, depois), card.id],
    );
    res.json(c);
  }),
);

board.delete(
  "/cards/:id",
  h(async (req, res) => {
    const card = await cardDoUsuario(id(req.params.id), req.userId);
    await query("DELETE FROM cards WHERE id = $1", [card.id]);
    res.status(204).end();
  }),
);
