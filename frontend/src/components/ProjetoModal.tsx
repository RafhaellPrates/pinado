import { useState, type FormEvent } from "react";
import type { Grupo } from "../api";
import { Modal } from "./Modal";

export interface DadosProjeto {
  nome: string;
  descricao: string;
  grupo_id: number;
}

export function ProjetoModal({
  inicial,
  grupos,
  novo,
  aoSalvar,
  aoFechar,
}: {
  inicial: DadosProjeto;
  grupos: Grupo[];
  novo: boolean;
  aoSalvar: (d: DadosProjeto) => Promise<void>;
  aoFechar: () => void;
}) {
  const [d, setD] = useState(inicial);
  const [erro, setErro] = useState("");

  async function enviar(e: FormEvent) {
    e.preventDefault();
    try {
      await aoSalvar({ ...d, nome: d.nome.trim() });
      aoFechar();
    } catch (err) {
      setErro((err as Error).message);
    }
  }

  return (
    <Modal titulo={novo ? "Novo projeto" : "Editar projeto"} aoFechar={aoFechar}>
      <form onSubmit={enviar} className="form">
        <label>
          Nome
          <input autoFocus required maxLength={80} value={d.nome} onChange={(e) => setD({ ...d, nome: e.target.value })} />
        </label>
        <label>
          Descrição
          <textarea rows={3} maxLength={500} value={d.descricao} onChange={(e) => setD({ ...d, descricao: e.target.value })} />
        </label>
        <label>
          Grupo
          <select value={d.grupo_id} onChange={(e) => setD({ ...d, grupo_id: Number(e.target.value) })}>
            {grupos.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nome}
              </option>
            ))}
          </select>
        </label>
        {erro && <p className="erro">{erro}</p>}
        <div className="acoes">
          <span className="espaco" />
          <button type="button" className="btn" onClick={aoFechar}>
            Cancelar
          </button>
          <button className="btn btn-primario" disabled={!d.nome.trim()}>
            {novo ? "Criar" : "Salvar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
