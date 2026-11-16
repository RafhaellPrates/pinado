export type Tema = Record<string, string>;

export const TOKENS: { chave: string; nome: string; dica: string }[] = [
  { chave: "bg", nome: "Fundo", dica: "Fundo geral do app" },
  { chave: "surface", nome: "Superfície", dica: "Barra do topo, cartões de projeto e modais" },
  { chave: "surface-2", nome: "Coluna", dica: "Fundo das colunas do board" },
  { chave: "border", nome: "Borda", dica: "Linhas e contornos" },
  { chave: "text", nome: "Texto", dica: "Texto principal" },
  { chave: "muted", nome: "Texto secundário", dica: "Legendas e contagens" },
  { chave: "accent", nome: "Destaque", dica: "Botões principais e seleção" },
  { chave: "accent-text", nome: "Texto do destaque", dica: "Texto em cima da cor de destaque" },
  { chave: "danger", nome: "Perigo", dica: "Excluir e erros" },
];

export const PRESETS: Record<string, { nome: string; tema: Tema }> = {
  claro: {
    nome: "Claro",
    tema: {
      bg: "#f4f5f7",
      surface: "#ffffff",
      "surface-2": "#ebecf0",
      border: "#dfe1e6",
      text: "#172b4d",
      muted: "#5e6c84",
      accent: "#0c66e4",
      "accent-text": "#ffffff",
      danger: "#c9372c",
    },
  },
  escuro: {
    nome: "Escuro",
    tema: {
      bg: "#161a1d",
      surface: "#22272b",
      "surface-2": "#1d2125",
      border: "#38414a",
      text: "#dee4ea",
      muted: "#9fadbc",
      accent: "#579dff",
      "accent-text": "#161a1d",
      danger: "#f87168",
    },
  },
  cortica: {
    nome: "Cortiça",
    tema: {
      bg: "#c8a27a",
      surface: "#fbf6ee",
      "surface-2": "#e6cfae",
      border: "#b48a5e",
      text: "#3b2a1a",
      muted: "#6e5440",
      accent: "#b4442b",
      "accent-text": "#ffffff",
      danger: "#a1261a",
    },
  },
};

export const TEMA_PADRAO = PRESETS.claro.tema;

// Completa com o padrão: tema salvo sem algum token não quebra a tela
export function completar(t: Tema | null | undefined): Tema {
  return { ...TEMA_PADRAO, ...(t ?? {}) };
}

export function aplicarTema(t: Tema | null | undefined) {
  const completo = completar(t);
  for (const [k, v] of Object.entries(completo)) document.documentElement.style.setProperty(`--${k}`, v);
  try {
    localStorage.setItem("pinado-tema", JSON.stringify(completo));
  } catch {
    /* sem storage, segue com o tema aplicado */
  }
}

// Preto ou branco, o que tiver mais contraste com o fundo
export function corDoTexto(fundo: string): string {
  const n = parseInt(fundo.slice(1), 16);
  const canal = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const l = 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
  return l > 0.4 ? "#1f2328" : "#ffffff";
}

export const CORES_POSTIT = [
  "#fde68a",
  "#fdba74",
  "#fca5a5",
  "#f9a8d4",
  "#c4b5fd",
  "#93c5fd",
  "#67e8f9",
  "#86efac",
  "#d9f99d",
  "#e5e7eb",
];
