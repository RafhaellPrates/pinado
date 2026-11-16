import { useState, type FormEvent } from "react";
import type { Card, Coluna } from "../api";
import { Modal } from "./Modal";
import { IconePrioridade, PRIORIDADES } from "./Prioridade";
import { SeletorCor } from "./SeletorCor";
import { PostItVisual } from "./PostIt";

export type DadosCard = Pick<Card, "titulo" | "descricao" | "cor" | "prioridade" | "coluna_id">;

export function CardModal({
  card,
  colunas,
  aoSalvar,
  aoExcluir,
  aoFechar,
}: {
  card: DadosCard & { id?: number };
  colunas: Coluna[];
  aoSalvar: (d: DadosCard) => Promise<void>;
  aoExcluir?: () => Promise<void>;
  aoFechar: () => void;
}) {
  const [d, setD] = useState<DadosCard>(card);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const novo = card.id === undefined;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro("");
    try {
      await aoSalvar({ ...d, titulo: d.titulo.trim() });
      aoFechar();
    } catch (err) {
      setErro((err as Error).message);
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!aoExcluir || !confirm("Excluir este post-it?")) return;
    await aoExcluir();
    aoFechar();
  }

  return (
    <Modal titulo={novo ? "Novo post-it" : "Editar post-it"} aoFechar={aoFechar} largura={560}>
      <form onSubmit={enviar} className="form">
        <div className="card-modal">
          <div className="card-modal-campos">
            <label>
              Título
              <input autoFocus required maxLength={200} value={d.titulo} onChange={(e) => setD({ ...d, titulo: e.target.value })} />
            </label>
            <label>
              Descrição
              <textarea rows={4} value={d.descricao} onChange={(e) => setD({ ...d, descricao: e.target.value })} />
            </label>
            <div className="campo">
              <span>Prioridade</span>
              <div className="segmentado">
                {PRIORIDADES.map((p) => (
                  <button
                    type="button"
                    key={p.valor}
                    className={d.prioridade === p.valor ? "ativo" : ""}
                    onClick={() => setD({ ...d, prioridade: p.valor })}
                  >
                    <IconePrioridade valor={p.valor} decorativo /> {p.nome}
                  </button>
                ))}
              </div>
            </div>
            <label>
              Coluna
              <select value={d.coluna_id} onChange={(e) => setD({ ...d, coluna_id: Number(e.target.value) })}>
                {colunas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>
            <div className="campo">
              <span>Cor</span>
              <SeletorCor valor={d.cor} aoMudar={(cor) => setD({ ...d, cor })} />
            </div>
          </div>
          <div className="card-modal-preview" aria-hidden>
            <PostItVisual card={{ ...d, id: 0, posicao: "", titulo: d.titulo || "Título" }} />
          </div>
        </div>
        {erro && <p className="erro">{erro}</p>}
        <div className="acoes">
          {!novo && aoExcluir && (
            <button type="button" className="btn btn-perigo" onClick={excluir}>
              Excluir
            </button>
          )}
          <span className="espaco" />
          <button type="button" className="btn" onClick={aoFechar}>
            Cancelar
          </button>
          <button className="btn btn-primario" disabled={salvando || !d.titulo.trim()}>
            {novo ? "Criar" : "Salvar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
