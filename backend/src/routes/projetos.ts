import { Router } from "express";
import { query, transacao } from "../db.js";
import { criarColunasPadrao } from "../seed.js";
import { ErroHttp, h, id, naoEncontrado, texto, textoOpcional } from "../util.js";

export const projetos = Router();

async function grupoDoUsuario(grupoId: number, userId: number) {
  const [g] = await query("SELECT id FROM grupos WHERE id = $1 AND user_id = $2", [grupoId, userId]);
  if (!g) naoEncontrado();
}

// Home: grupos com seus projetos e a contagem por status
projetos.get(
  "/home",
  h(async (req, res) => {
    const grupos = await query("SELECT id, nome, posicao FROM grupos WHERE user_id = $1 ORDER BY posicao, id", [
      req.userId,
    ]);
    const lista = await query(
      `SELECT p.id, p.grupo_id, p.nome, p.descricao, p.arquivado,
              count(c.id) FILTER (WHERE col.status = 'todo')::int  AS todo,
              count(c.id) FILTER (WHERE col.status = 'doing')::int AS doing,
              count(c.id) FILTER (WHERE col.status = 'done')::int  AS done
         FROM projetos p
         LEFT JOIN cards c ON c.projeto_id = p.id
         LEFT JOIN colunas col ON col.id = c.coluna_id
        WHERE p.user_id = $1
        GROUP BY p.id
        ORDER BY p.posicao, p.criado_em`,
      [req.userId],
    );
    res.json(grupos.map((g) => ({ ...g, projetos: lista.filter((p) => p.grupo_id === g.id) })));
  }),
);

projetos.post(
  "/grupos",
  h(async (req, res) => {
    const nome = texto(req.body?.nome, "Nome", 60);
    const [g] = await query(
      `INSERT INTO grupos (user_id, nome, posicao)
       VALUES ($1, $2, (SELECT coalesce(max(posicao), -1) + 1 FROM grupos WHERE user_id = $1))
       RETURNING id, nome, posicao`,
      [req.userId, nome],
    );
    res.status(201).json({ ...g, projetos: [] });
  }),
);

projetos.put(
  "/grupos/:id",
  h(async (req, res) => {
    const nome = texto(req.body?.nome, "Nome", 60);
    const [g] = await query("UPDATE grupos SET nome = $1 WHERE id = $2 AND user_id = $3 RETURNING id, nome", [
      nome,
      id(req.params.id),
      req.userId,
    ]);
    if (!g) naoEncontrado();
    res.json(g);
  }),
);

projetos.delete(
  "/grupos/:id",
  h(async (req, res) => {
    const grupoId = id(req.params.id);
    await grupoDoUsuario(grupoId, req.userId);
    const [{ total }] = await query("SELECT count(*)::int AS total FROM projetos WHERE grupo_id = $1", [grupoId]);
    if (total > 0) throw new ErroHttp(409, "Mova ou exclua os projetos do grupo antes de removê-lo");
    await query("DELETE FROM grupos WHERE id = $1", [grupoId]);
    res.status(204).end();
  }),
);

projetos.post(
  "/projetos",
  h(async (req, res) => {
    const grupoId = id(req.body?.grupo_id);
    await grupoDoUsuario(grupoId, req.userId);
    const nome = texto(req.body?.nome, "Nome", 80);
    const descricao = textoOpcional(req.body?.descricao, "Descrição", 500);
    const p = await transacao(async (c) => {
      const novo = (
        await c.query(
          `INSERT INTO projetos (user_id, grupo_id, nome, descricao, posicao)
           VALUES ($1, $2, $3, $4, (SELECT coalesce(max(posicao), -1) + 1 FROM projetos WHERE grupo_id = $2))
           RETURNING id, grupo_id, nome, descricao, arquivado`,
          [req.userId, grupoId, nome, descricao],
        )
      ).rows[0];
      await criarColunasPadrao(c, novo.id);
      return novo;
    });
    res.status(201).json({ ...p, todo: 0, doing: 0, done: 0 });
  }),
);

projetos.put(
  "/projetos/:id",
  h(async (req, res) => {
    const projetoId = id(req.params.id);
    const [atual] = await query("SELECT * FROM projetos WHERE id = $1 AND user_id = $2", [projetoId, req.userId]);
    if (!atual) naoEncontrado();
    const b = req.body ?? {};
    const nome = b.nome !== undefined ? texto(b.nome, "Nome", 80) : atual.nome;
    const descricao = b.descricao !== undefined ? textoOpcional(b.descricao, "Descrição", 500) : atual.descricao;
    const arquivado = b.arquivado !== undefined ? Boolean(b.arquivado) : atual.arquivado;
    const grupoId = b.grupo_id !== undefined ? id(b.grupo_id) : atual.grupo_id;
    if (grupoId !== atual.grupo_id) await grupoDoUsuario(grupoId, req.userId);
    const [p] = await query(
      `UPDATE projetos SET nome = $1, descricao = $2, arquivado = $3, grupo_id = $4 WHERE id = $5
       RETURNING id, grupo_id, nome, descricao, arquivado`,
      [nome, descricao, arquivado, grupoId, projetoId],
    );
    res.json(p);
  }),
);

projetos.delete(
  "/projetos/:id",
  h(async (req, res) => {
    const r = await query("DELETE FROM projetos WHERE id = $1 AND user_id = $2 RETURNING id", [
      id(req.params.id),
      req.userId,
    ]);
    if (!r.length) naoEncontrado();
    res.status(204).end();
  }),
);
