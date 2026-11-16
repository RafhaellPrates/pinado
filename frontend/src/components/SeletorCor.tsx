import { CORES_POSTIT } from "../tema";

// Paleta sugerida + qualquer cor pelo seletor nativo
export function SeletorCor({ valor, aoMudar, cores = CORES_POSTIT }: { valor: string; aoMudar: (c: string) => void; cores?: string[] }) {
  return (
    <div className="seletor-cor">
      {cores.map((c) => (
        <button
          key={c}
          type="button"
          className={`amostra ${c === valor ? "ativa" : ""}`}
          style={{ background: c }}
          onClick={() => aoMudar(c)}
          aria-label={`Cor ${c}`}
        />
      ))}
      <label className="amostra amostra-livre" title="Escolher outra cor" style={{ background: cores.includes(valor) ? undefined : valor }}>
        <input type="color" value={valor} onChange={(e) => aoMudar(e.target.value)} />
        {cores.includes(valor) && <span>+</span>}
      </label>
    </div>
  );
}
