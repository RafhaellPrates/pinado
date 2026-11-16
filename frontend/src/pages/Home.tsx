import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, type Grupo, type Projeto } from "../api";
import { Menu } from "../components/Menu";
import { Modal } from "../components/Modal";
import { ProjetoModal, type DadosProjeto } from "../components/ProjetoModal";

type ModalProjeto = { novo: true; inicial: DadosProjeto } | { novo: false; id: number; inicial: DadosProjeto };
type ModalGrupo = { id?: number; nome: string };

export function Home() {
  const [grupos, setGrupos] = useState<Grupo[] | null>(null);
  const [erro, setErro] = useState("");
  const [arquivados, setArquivados] = useState(false);
  const [modalProjeto, setModalProjeto] = useState<ModalProjeto | null>(null);
  const [modalGrupo, setModalGrupo] = useState<ModalGrupo | null>(null);

  const carregar = () =>
    api<Grupo[]>("/home")
      .then(setGrupos)
      .catch((e) => setErro(e.message));

  useEffect(() => {
    carregar();
  }, []);

  async function salvarProjeto(d: DadosProjeto) {
    if (!modalProjeto) return;
    if (modalProjeto.novo) await api("/projetos", { method: "POST", body: d });
    else await api(`/projetos/${modalProjeto.id}`, { method: "PUT", body: d });
    await carregar();
  }

  async function acao(fn: () => Promise<unknown>) {
    try {
      await fn();
      await carregar();
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  if (!grupos) return <div className="carregando">{erro || "Carregando..."}</div>;

  const temArquivado = grupos.some((g) => g.projetos.some((p) => p.arquivado));

  return (
    <div className="home">
      <div className="home-topo">
        <h1>Projetos</h1>
        <div className="home-acoes">
          {temArquivado && (
            <label className="toggle">
              <input type="checkbox" checked={arquivados} onChange={(e) => setArquivados(e.target.checked)} />
              Mostrar arquivados
            </label>
          )}
          <button className="btn" onClick={() => setModalGrupo({ nome: "" })}>
            + Grupo
          </button>
        </div>
      </div>
      {erro && (
        <p className="erro" onClick={() => setErro("")}>
          {erro}
        </p>
      )}

      {grupos.map((g) => {
        const lista = g.projetos.filter((p) => arquivados || !p.arquivado);
        return (
          <section key={g.id} className="grupo">
            <div className="grupo-topo">
              <h2>{g.nome}</h2>
              <span className="contagem">{lista.length}</span>
              <Menu
                rotulo={`Ações do grupo ${g.nome}`}
                itens={[
                  { texto: "Renomear", acao: () => setModalGrupo({ id: g.id, nome: g.nome }) },
                  {
                    texto: "Excluir grupo",
                    perigo: true,
                    acao: () => confirm(`Excluir o grupo ${g.nome}?`) && acao(() => api(`/grupos/${g.id}`, { method: "DELETE" })),
                  },
                ]}
              />
            </div>
            <div className="projetos">
              {lista.map((p) => (
                <CardProjeto
                  key={p.id}
                  p={p}
                  aoEditar={() =>
                    setModalProjeto({ novo: false, id: p.id, inicial: { nome: p.nome, descricao: p.descricao, grupo_id: p.grupo_id } })
                  }
                  aoArquivar={() => acao(() => api(`/projetos/${p.id}`, { method: "PUT", body: { arquivado: !p.arquivado } }))}
                  aoExcluir={() =>
                    confirm(`Excluir o projeto ${p.nome} e todos os post-its dele?`) &&
                    acao(() => api(`/projetos/${p.id}`, { method: "DELETE" }))
                  }
                />
              ))}
              <button
                className="projeto-novo"
                onClick={() => setModalProjeto({ novo: true, inicial: { nome: "", descricao: "", grupo_id: g.id } })}
              >
                + Novo projeto
              </button>
            </div>
          </section>
        );
      })}

      {modalProjeto && (
        <ProjetoModal
          novo={modalProjeto.novo}
          inicial={modalProjeto.inicial}
          grupos={grupos}
          aoSalvar={salvarProjeto}
          aoFechar={() => setModalProjeto(null)}
        />
      )}
      {modalGrupo && (
        <GrupoModal
          inicial={modalGrupo}
          aoFechar={() => setModalGrupo(null)}
          aoSalvar={async (nome) => {
            if (modalGrupo.id) await api(`/grupos/${modalGrupo.id}`, { method: "PUT", body: { nome } });
            else await api("/grupos", { method: "POST", body: { nome } });
            await carregar();
          }}
        />
      )}
    </div>
  );
}

function CardProjeto({ p, aoEditar, aoArquivar, aoExcluir }: { p: Projeto; aoEditar: () => void; aoArquivar: () => void; aoExcluir: () => void }) {
  const total = p.todo + p.doing + p.done;
  const pct = (n: number) => (total ? (n / total) * 100 : 0);
  return (
    <Link to={`/projetos/${p.id}`} className={`projeto ${p.arquivado ? "arquivado" : ""}`}>
      <div className="projeto-topo">
        <h3>{p.nome}</h3>
        <Menu
          rotulo={`Ações do projeto ${p.nome}`}
          itens={[
            { texto: "Editar", acao: aoEditar },
            { texto: p.arquivado ? "Desarquivar" : "Arquivar", acao: aoArquivar },
            { texto: "Excluir", acao: aoExcluir, perigo: true },
          ]}
        />
      </div>
      {p.descricao && <p className="projeto-desc">{p.descricao}</p>}
      {p.arquivado && <span className="tag">Arquivado</span>}
      <div className="progresso" aria-label={`${p.done} de ${total} feitos`}>
        <span className="p-done" style={{ width: `${pct(p.done)}%` }} />
        <span className="p-doing" style={{ width: `${pct(p.doing)}%` }} />
      </div>
      <div className="projeto-contas">
        <span>
          <i className="bolinha b-todo" />A fazer {p.todo}
        </span>
        <span>
          <i className="bolinha b-doing" />Fazendo {p.doing}
        </span>
        <span>
          <i className="bolinha b-done" />Feito {p.done}
        </span>
      </div>
    </Link>
  );
}

function GrupoModal({ inicial, aoSalvar, aoFechar }: { inicial: ModalGrupo; aoSalvar: (nome: string) => Promise<void>; aoFechar: () => void }) {
  const [nome, setNome] = useState(inicial.nome);
  const [erro, setErro] = useState("");
  async function enviar(e: FormEvent) {
    e.preventDefault();
    try {
      await aoSalvar(nome.trim());
      aoFechar();
    } catch (err) {
      setErro((err as Error).message);
    }
  }
  return (
    <Modal titulo={inicial.id ? "Renomear grupo" : "Novo grupo"} aoFechar={aoFechar} largura={400}>
      <form className="form" onSubmit={enviar}>
        <label>
          Nome
          <input autoFocus required maxLength={60} value={nome} onChange={(e) => setNome(e.target.value)} />
        </label>
        {erro && <p className="erro">{erro}</p>}
        <div className="acoes">
          <span className="espaco" />
          <button type="button" className="btn" onClick={aoFechar}>
            Cancelar
          </button>
          <button className="btn btn-primario" disabled={!nome.trim()}>
            Salvar
          </button>
        </div>
      </form>
    </Modal>
  );
}
