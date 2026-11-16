import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { api, type Card, type Coluna } from "../api";
import { PostIt, PostItVisual } from "../components/PostIt";
import { CardModal, type DadosCard } from "../components/CardModal";
import { IconePrioridade, PRIORIDADES } from "../components/Prioridade";

type Itens = Record<number, Card[]>;
type Ordem = "manual" | "prioridade";

interface Projeto {
  id: number;
  nome: string;
  descricao: string;
}

const ID_COLUNA = "col-";

function agrupar(colunas: Coluna[], cards: Card[]): Itens {
  const r: Itens = {};
  for (const c of colunas) r[c.id] = [];
  for (const c of cards) r[c.coluna_id]?.push(c);
  return r;
}

export function Board() {
  const projetoId = Number(useParams().id);
  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [colunas, setColunas] = useState<Coluna[]>([]);
  const [itens, setItens] = useState<Itens>({});
  const [erro, setErro] = useState("");
  const [filtro, setFiltro] = useState<number[]>([]);
  const [ordem, setOrdem] = useState<Ordem>(() => (localStorage.getItem("pinado-ordem") as Ordem) ?? "manual");
  const [ativo, setAtivo] = useState<Card | null>(null);
  const [modal, setModal] = useState<(DadosCard & { id?: number }) | null>(null);

  const itensRef = useRef(itens);
  itensRef.current = itens;
  const origem = useRef<{ snapshot: Itens; coluna: number; indice: number } | null>(null);

  const carregar = useCallback(async () => {
    try {
      const b = await api<{ projeto: Projeto; colunas: Coluna[]; cards: Card[] }>(`/projetos/${projetoId}/board`);
      setProjeto(b.projeto);
      setColunas(b.colunas);
      setItens(agrupar(b.colunas, b.cards));
    } catch (e) {
      setErro((e as Error).message);
    }
  }, [projetoId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    try {
      localStorage.setItem("pinado-ordem", ordem);
    } catch {
      /* preferência só desta sessão */
    }
  }, [ordem]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function colunaDe(idDnd: UniqueIdentifier): number | undefined {
    if (typeof idDnd === "string" && idDnd.startsWith(ID_COLUNA)) return Number(idDnd.slice(ID_COLUNA.length));
    for (const [col, lista] of Object.entries(itensRef.current)) if (lista.some((c) => c.id === idDnd)) return Number(col);
  }

  function aoComecar({ active }: DragStartEvent) {
    const col = colunaDe(active.id)!;
    const lista = itensRef.current[col];
    setAtivo(lista.find((c) => c.id === active.id) ?? null);
    origem.current = { snapshot: itensRef.current, coluna: col, indice: lista.findIndex((c) => c.id === active.id) };
  }

  // Troca de coluna durante o arraste, pra o card aparecer no lugar onde vai cair
  function aoPassar({ active, over }: DragOverEvent) {
    if (!over) return;
    const de = colunaDe(active.id);
    const para = colunaDe(over.id);
    if (de === undefined || para === undefined || de === para) return;
    setItens((prev) => {
      const card = prev[de].find((c) => c.id === active.id);
      if (!card) return prev;
      const destino = [...prev[para]];
      const iOver = destino.findIndex((c) => c.id === over.id);
      const indice = ordem === "prioridade" || iOver < 0 ? destino.length : iOver;
      destino.splice(indice, 0, { ...card, coluna_id: para });
      return { ...prev, [de]: prev[de].filter((c) => c.id !== active.id), [para]: destino };
    });
  }

  async function aoSoltar({ active, over }: DragEndEvent) {
    setAtivo(null);
    const o = origem.current;
    origem.current = null;
    const col = colunaDe(active.id);
    if (!o || col === undefined) return;

    let lista = itensRef.current[col];
    if (over && ordem === "manual") {
      const de = lista.findIndex((c) => c.id === active.id);
      const para = lista.findIndex((c) => c.id === over.id);
      if (para >= 0 && de !== para) lista = arrayMove(lista, de, para);
    }
    const indice = lista.findIndex((c) => c.id === active.id);
    if (col === o.coluna && indice === o.indice) {
      setItens(o.snapshot);
      return;
    }
    setItens({ ...itensRef.current, [col]: lista });

    try {
      const atualizado = await api<Card>(`/cards/${active.id}/mover`, {
        method: "PUT",
        body: { coluna_id: col, antes_id: lista[indice - 1]?.id ?? null, depois_id: lista[indice + 1]?.id ?? null },
      });
      setItens((prev) => ({ ...prev, [col]: prev[col].map((c) => (c.id === atualizado.id ? atualizado : c)) }));
    } catch (e) {
      setErro((e as Error).message);
      carregar();
    }
  }

  function aoCancelar() {
    if (origem.current) setItens(origem.current.snapshot);
    origem.current = null;
    setAtivo(null);
  }

  function visiveis(lista: Card[]) {
    const f = filtro.length ? lista.filter((c) => filtro.includes(c.prioridade)) : lista;
    return ordem === "prioridade" ? [...f].sort((a, b) => a.prioridade - b.prioridade) : f;
  }

  async function salvarCard(d: DadosCard, id?: number) {
    if (id === undefined) {
      const novo = await api<Card>("/cards", { method: "POST", body: d });
      setItens((prev) => ({ ...prev, [novo.coluna_id]: [...prev[novo.coluna_id], novo] }));
      return;
    }
    const anterior = Object.values(itensRef.current).flat().find((c) => c.id === id)!;
    let c = await api<Card>(`/cards/${id}`, { method: "PUT", body: d });
    if (d.coluna_id !== anterior.coluna_id) c = await api<Card>(`/cards/${id}/mover`, { method: "PUT", body: { coluna_id: d.coluna_id } });
    setItens((prev) => {
      const r: Itens = {};
      for (const [col, lista] of Object.entries(prev)) r[Number(col)] = lista.filter((x) => x.id !== id);
      r[c.coluna_id] = [...r[c.coluna_id], c].sort((a, b) => (a.posicao < b.posicao ? -1 : 1));
      return r;
    });
  }

  // Troca rápida pelo ícone: atualiza na tela na hora e desfaz se a API falhar
  async function mudarPrioridade(card: Card, prioridade: Card["prioridade"]) {
    const trocar = (p: Card["prioridade"]) =>
      setItens((prev) => ({
        ...prev,
        [card.coluna_id]: prev[card.coluna_id].map((c) => (c.id === card.id ? { ...c, prioridade: p } : c)),
      }));
    trocar(prioridade);
    try {
      await api(`/cards/${card.id}`, { method: "PUT", body: { prioridade } });
    } catch (e) {
      trocar(card.prioridade);
      setErro((e as Error).message);
    }
  }

  async function excluirCard(id: number) {
    await api(`/cards/${id}`, { method: "DELETE" });
    setItens((prev) => {
      const r: Itens = {};
      for (const [col, lista] of Object.entries(prev)) r[Number(col)] = lista.filter((x) => x.id !== id);
      return r;
    });
  }

  async function salvarColuna(id: number, dados: Partial<Pick<Coluna, "nome" | "cor">>) {
    setColunas((prev) => prev.map((c) => (c.id === id ? { ...c, ...dados } : c)));
    try {
      await api(`/colunas/${id}`, { method: "PUT", body: dados });
    } catch (e) {
      setErro((e as Error).message);
      carregar();
    }
  }

  function novoCard(colunaId: number) {
    setModal({ titulo: "", descricao: "", cor: "#fde68a", prioridade: 3, coluna_id: colunaId });
  }

  if (!projeto) return <div className="carregando">{erro || "Carregando..."}</div>;

  const total = Object.values(itens).reduce((s, l) => s + l.length, 0);

  return (
    <div className="board-pagina">
      <div className="board-topo">
        <div>
          <Link to="/" className="voltar">
            ← Projetos
          </Link>
          <h1>{projeto.nome}</h1>
          {projeto.descricao && <p className="muted">{projeto.descricao}</p>}
        </div>
        <button className="btn btn-primario" onClick={() => colunas[0] && novoCard(colunas[0].id)}>
          + Post-it
        </button>
      </div>

      <div className="board-filtros">
        <div className="chips" role="group" aria-label="Filtrar por prioridade">
          {PRIORIDADES.map((p) => {
            const on = filtro.includes(p.valor);
            return (
              <button
                key={p.valor}
                className={`chip ${on ? "ativo" : ""}`}
                aria-pressed={on}
                onClick={() => setFiltro(on ? filtro.filter((x) => x !== p.valor) : [...filtro, p.valor])}
              >
                <IconePrioridade valor={p.valor} tamanho={14} decorativo /> {p.nome}
              </button>
            );
          })}
          {filtro.length > 0 && (
            <button className="chip chip-limpar" onClick={() => setFiltro([])}>
              Limpar
            </button>
          )}
        </div>
        <div className="segmentado pequeno" role="group" aria-label="Ordem dos post-its">
          <button className={ordem === "manual" ? "ativo" : ""} onClick={() => setOrdem("manual")}>
            Manual
          </button>
          <button className={ordem === "prioridade" ? "ativo" : ""} onClick={() => setOrdem("prioridade")}>
            Por prioridade
          </button>
        </div>
      </div>
      {erro && (
        <p className="erro" onClick={() => setErro("")}>
          {erro}
        </p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={aoComecar}
        onDragOver={aoPassar}
        onDragEnd={aoSoltar}
        onDragCancel={aoCancelar}
      >
        <div className="board">
          {colunas.map((col) => (
            <ColunaView
              key={col.id}
              coluna={col}
              cards={visiveis(itens[col.id] ?? [])}
              total={(itens[col.id] ?? []).length}
              ordem={ordem}
              aoAbrir={(c) => setModal(c)}
              aoPrioridade={mudarPrioridade}
              aoNovo={() => novoCard(col.id)}
              aoSalvar={(d) => salvarColuna(col.id, d)}
            />
          ))}
        </div>
        <DragOverlay>{ativo && <PostItVisual card={ativo} arrastando />}</DragOverlay>
      </DndContext>

      {total === 0 && <p className="muted vazio-board">Nenhum post-it ainda. Clique em "+ Post-it" pra criar o primeiro.</p>}

      {modal && (
        <CardModal
          card={modal}
          colunas={colunas}
          aoFechar={() => setModal(null)}
          aoSalvar={(d) => salvarCard(d, modal.id)}
          aoExcluir={modal.id !== undefined ? () => excluirCard(modal.id!) : undefined}
        />
      )}
    </div>
  );
}

function ColunaView({
  coluna,
  cards,
  total,
  ordem,
  aoAbrir,
  aoPrioridade,
  aoNovo,
  aoSalvar,
}: {
  coluna: Coluna;
  cards: Card[];
  total: number;
  ordem: Ordem;
  aoAbrir: (c: Card) => void;
  aoPrioridade: (c: Card, p: Card["prioridade"]) => void;
  aoNovo: () => void;
  aoSalvar: (d: Partial<Pick<Coluna, "nome" | "cor">>) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `${ID_COLUNA}${coluna.id}`, data: { tipo: "coluna" } });
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(coluna.nome);

  function confirmarNome() {
    setEditando(false);
    if (nome.trim() && nome.trim() !== coluna.nome) aoSalvar({ nome: nome.trim() });
    else setNome(coluna.nome);
  }

  return (
    <section className={`coluna ${isOver ? "coluna-alvo" : ""}`} style={{ "--cor-coluna": coluna.cor } as React.CSSProperties}>
      <header className="coluna-topo">
        <label className="coluna-cor" title="Cor da coluna">
          <input type="color" value={coluna.cor} onChange={(e) => aoSalvar({ cor: e.target.value })} />
        </label>
        {editando ? (
          <input
            className="coluna-nome-input"
            autoFocus
            value={nome}
            maxLength={40}
            onChange={(e) => setNome(e.target.value)}
            onBlur={confirmarNome}
            onKeyDown={(e) => e.key === "Enter" && confirmarNome()}
          />
        ) : (
          <button className="coluna-nome" onClick={() => setEditando(true)} title="Renomear coluna">
            {coluna.nome}
          </button>
        )}
        <span className="contagem">{cards.length === total ? total : `${cards.length}/${total}`}</span>
        <button className="btn-icone" onClick={aoNovo} aria-label={`Novo post-it em ${coluna.nome}`}>
          +
        </button>
      </header>
      <SortableContext
        items={cards.map((c) => c.id)}
        strategy={ordem === "manual" ? verticalListSortingStrategy : () => null}
      >
        <div ref={setNodeRef} className="coluna-cards">
          {cards.map((c) => (
            <PostIt key={c.id} card={c} aoAbrir={() => aoAbrir(c)} aoPrioridade={(p) => aoPrioridade(c, p)} />
          ))}
          <button className="coluna-add" onClick={aoNovo}>
            + Adicionar
          </button>
        </div>
      </SortableContext>
    </section>
  );
}
