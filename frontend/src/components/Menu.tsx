import { useEffect, useRef, useState } from "react";

// Menu "⋯" simples com itens de ação
export function Menu({ itens, rotulo = "Mais ações" }: { itens: { texto: string; acao: () => void; perigo?: boolean }[]; rotulo?: string }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setAberto(false);
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [aberto]);

  return (
    <div className="menu" ref={ref}>
      <button
        className="btn-icone"
        aria-label={rotulo}
        aria-expanded={aberto}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setAberto(!aberto);
        }}
      >
        ⋯
      </button>
      {aberto && (
        <div className="menu-lista" role="menu">
          {itens.map((i) => (
            <button
              key={i.texto}
              role="menuitem"
              className={i.perigo ? "perigo" : ""}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setAberto(false);
                i.acao();
              }}
            >
              {i.texto}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
