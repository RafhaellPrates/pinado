import { useEffect, useLayoutEffect, useRef, useState, type SyntheticEvent } from "react";
import { createPortal } from "react-dom";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Card } from "../api";
import { corDoTexto } from "../tema";
import { IconePrioridade, PRIORIDADES, nomePrioridade } from "./Prioridade";

type Prioridade = Card["prioridade"];

// Impede que o clique no seletor abra o modal do post-it ou comece um arraste
const isolar = {
  onClick: (e: SyntheticEvent) => e.stopPropagation(),
  onMouseDown: (e: SyntheticEvent) => e.stopPropagation(),
  onTouchStart: (e: SyntheticEvent) => e.stopPropagation(),
  onPointerDown: (e: SyntheticEvent) => e.stopPropagation(),
  onKeyDown: (e: SyntheticEvent) => e.stopPropagation(),
};

function SeletorPrioridade({ valor, aoEscolher }: { valor: Prioridade; aoEscolher: (p: Prioridade) => void }) {
  const [aberto, setAberto] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);

  // Abre à direita do ícone; se não couber na tela, abre à esquerda
  useLayoutEffect(() => {
    if (!aberto || !botao.current || !pop.current) return;
    const r = botao.current.getBoundingClientRect();
    const larg = pop.current.offsetWidth;
    const alt = pop.current.offsetHeight;
    const left = r.right + 6 + larg > window.innerWidth - 8 ? r.left - 6 - larg : r.right + 6;
    const top = Math.min(r.top - 4, window.innerHeight - alt - 8);
    setPos({ top: Math.max(8, top), left: Math.max(8, left) });
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: Event) => {
      const alvo = e.target as Node;
      if (!pop.current?.contains(alvo) && !botao.current?.contains(alvo)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    const fechar = () => setAberto(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("touchstart", fora);
    document.addEventListener("keydown", esc);
    window.addEventListener("scroll", fechar, true);
    window.addEventListener("resize", fechar);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("touchstart", fora);
      document.removeEventListener("keydown", esc);
      window.removeEventListener("scroll", fechar, true);
      window.removeEventListener("resize", fechar);
    };
  }, [aberto]);

  useEffect(() => {
    if (aberto && pos) pop.current?.querySelector<HTMLButtonElement>("[aria-checked=true]")?.focus();
  }, [aberto, pos]);

  return (
    <>
      <button
        ref={botao}
        type="button"
        className="postit-prioridade"
        aria-label={`Prioridade ${nomePrioridade(valor)}. Alterar`}
        aria-haspopup="menu"
        aria-expanded={aberto}
        {...isolar}
        onClick={(e) => {
          e.stopPropagation();
          setPos(null);
          setAberto(!aberto);
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setPos(null);
            setAberto(!aberto);
          }
        }}
      >
        <IconePrioridade valor={valor} decorativo />
      </button>
      {aberto &&
        createPortal(
          <div
            ref={pop}
            className="pop-prioridade"
            role="menu"
            aria-label="Prioridade"
            style={pos ? { top: pos.top, left: pos.left } : { visibility: "hidden" }}
            {...isolar}
          >
            {PRIORIDADES.map((p) => (
              <button
                key={p.valor}
                type="button"
                role="menuitemradio"
                aria-checked={p.valor === valor}
                className={p.valor === valor ? "ativo" : ""}
                onClick={(e) => {
                  e.stopPropagation();
                  setAberto(false);
                  botao.current?.focus();
                  if (p.valor !== valor) aoEscolher(p.valor);
                }}
              >
                <IconePrioridade valor={p.valor} decorativo />
                {p.nome}
                {p.valor === valor && <span className="pop-check">✓</span>}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}

export function PostItVisual({
  card,
  arrastando,
  aoPrioridade,
}: {
  card: Card;
  arrastando?: boolean;
  aoPrioridade?: (p: Prioridade) => void;
}) {
  return (
    <div className={`postit ${arrastando ? "postit-no-ar" : ""}`} style={{ background: card.cor, color: corDoTexto(card.cor) }}>
      <div className="postit-topo">
        <strong className="postit-titulo">{card.titulo}</strong>
        {aoPrioridade ? (
          <SeletorPrioridade valor={card.prioridade} aoEscolher={aoPrioridade} />
        ) : (
          <span className="postit-prioridade">
            <IconePrioridade valor={card.prioridade} />
          </span>
        )}
      </div>
      {card.descricao && <p className="postit-desc">{card.descricao}</p>}
    </div>
  );
}

export function PostIt({
  card,
  aoAbrir,
  aoPrioridade,
  travado,
}: {
  card: Card;
  aoAbrir: () => void;
  aoPrioridade: (p: Prioridade) => void;
  travado?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { tipo: "card", colunaId: card.coluna_id },
    disabled: travado,
  });
  return (
    <div
      ref={setNodeRef}
      className={`postit-slot ${isDragging ? "postit-sombra" : ""}`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      onClick={aoAbrir}
      {...attributes}
      {...listeners}
    >
      <PostItVisual card={card} aoPrioridade={aoPrioridade} />
    </div>
  );
}
