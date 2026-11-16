import type pg from "pg";

export const GRUPOS_PADRAO = ["Pessoal", "Borgno"];

export const COLUNAS_PADRAO = [
  { nome: "A fazer", status: "todo", cor: "#64748b" },
  { nome: "Fazendo", status: "doing", cor: "#2563eb" },
  { nome: "Feito", status: "done", cor: "#16a34a" },
];

export async function criarColunasPadrao(c: pg.PoolClient, projetoId: number) {
  for (const [i, col] of COLUNAS_PADRAO.entries()) {
    await c.query("INSERT INTO colunas (projeto_id, nome, status, cor, posicao) VALUES ($1,$2,$3,$4,$5)", [
      projetoId,
      col.nome,
      col.status,
      col.cor,
      i,
    ]);
  }
}
