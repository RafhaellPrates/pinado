const TOKEN = "pinado-token";

export const token = {
  get: () => localStorage.getItem(TOKEN),
  set: (t: string) => localStorage.setItem(TOKEN, t),
  limpar: () => localStorage.removeItem(TOKEN),
};

export async function api<T = unknown>(caminho: string, opcoes: { method?: string; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const t = token.get();
  if (t) headers.authorization = `Bearer ${t}`;
  if (opcoes.body !== undefined) headers["content-type"] = "application/json";

  const res = await fetch(`/api${caminho}`, {
    method: opcoes.method ?? "GET",
    headers,
    body: opcoes.body !== undefined ? JSON.stringify(opcoes.body) : undefined,
  });

  if (res.status === 401 && caminho !== "/auth/login") {
    token.limpar();
    window.location.href = "/login";
    throw new Error("Sessão expirada");
  }
  if (res.status === 204) return undefined as T;
  const dados = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(dados.erro ?? "Algo deu errado");
  return dados as T;
}

export interface User {
  id: number;
  nome: string;
  email: string;
  tema: Record<string, string> | null;
}

export interface Projeto {
  id: number;
  grupo_id: number;
  nome: string;
  descricao: string;
  arquivado: boolean;
  todo: number;
  doing: number;
  done: number;
}

export interface Grupo {
  id: number;
  nome: string;
  projetos: Projeto[];
}

export type Status = "todo" | "doing" | "done";

export interface Coluna {
  id: number;
  nome: string;
  status: Status;
  cor: string;
}

export interface Card {
  id: number;
  coluna_id: number;
  titulo: string;
  descricao: string;
  cor: string;
  prioridade: 1 | 2 | 3 | 4;
  posicao: string;
}
