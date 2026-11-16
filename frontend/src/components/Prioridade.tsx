export const PRIORIDADES = [
  { valor: 1, nome: "Urgente", cor: "#dc2626" },
  { valor: 2, nome: "Alta", cor: "#ea580c" },
  { valor: 3, nome: "Média", cor: "#ca8a04" },
  { valor: 4, nome: "Baixa", cor: "#2563eb" },
] as const;

export function nomePrioridade(p: number) {
  return PRIORIDADES.find((x) => x.valor === p)?.nome ?? "";
}

// Ícones no estilo do Jira: setas pra cima (urgente, alta), igual (média), seta pra baixo (baixa)
// decorativo: dentro de botão que já tem o nome da prioridade escrito
export function IconePrioridade({ valor, tamanho = 16, decorativo }: { valor: number; tamanho?: number; decorativo?: boolean }) {
  const p = PRIORIDADES.find((x) => x.valor === valor) ?? PRIORIDADES[2];
  const traco = { stroke: p.cor, strokeWidth: 2.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  const a11y = decorativo ? { "aria-hidden": true } : { role: "img", "aria-label": `Prioridade ${p.nome}` };
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 16 16" {...a11y}>
      {!decorativo && <title>{`Prioridade ${p.nome}`}</title>}
      {valor === 1 && (
        <>
          <path d="M3 8.5 8 4l5 4.5" {...traco} />
          <path d="M3 12.5 8 8l5 4.5" {...traco} />
        </>
      )}
      {valor === 2 && <path d="M3 10.5 8 6l5 4.5" {...traco} />}
      {valor === 3 && (
        <>
          <path d="M3 6h10" {...traco} />
          <path d="M3 10h10" {...traco} />
        </>
      )}
      {valor === 4 && <path d="M3 5.5 8 10l5-4.5" {...traco} />}
    </svg>
  );
}
