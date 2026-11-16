import { useEffect, useRef, useState } from "react";
import { api, type User } from "../api";
import { useAuth } from "../auth";
import { PRESETS, TEMA_PADRAO, TOKENS, aplicarTema, completar, type Tema } from "../tema";
import { PostItVisual } from "../components/PostIt";

export function TemaPage() {
  const { user, atualizar } = useAuth();
  const [rascunho, setRascunho] = useState<Tema>(() => completar(user?.tema));
  const [msg, setMsg] = useState("");
  const salvo = useRef(user?.tema ?? null);

  // Preview ao vivo no app inteiro
  useEffect(() => {
    aplicarTema(rascunho);
  }, [rascunho]);

  // Saiu da tela sem salvar: volta pro tema salvo
  useEffect(() => () => aplicarTema(salvo.current), []);

  const alterado = JSON.stringify(rascunho) !== JSON.stringify(completar(salvo.current));

  async function salvar() {
    const u = await api<User>("/me/tema", { method: "PUT", body: { tema: rascunho } });
    salvo.current = u.tema;
    atualizar(u);
    setMsg("Tema salvo");
    setTimeout(() => setMsg(""), 2000);
  }

  return (
    <div className="pagina-estreita">
      <h1>Tema</h1>
      <p className="muted">As mudanças aparecem na hora. Clique em salvar pra guardar.</p>

      <div className="presets">
        {Object.entries(PRESETS).map(([k, p]) => (
          <button key={k} className="preset" onClick={() => setRascunho({ ...p.tema })}>
            <span className="preset-amostra" style={{ background: p.tema.bg }}>
              <i style={{ background: p.tema.surface }} />
              <i style={{ background: p.tema.accent }} />
            </span>
            {p.nome}
          </button>
        ))}
      </div>

      <div className="tema-grade">
        <div className="tokens">
          {TOKENS.map((t) => (
            <label key={t.chave} className="token">
              <input type="color" value={rascunho[t.chave]} onChange={(e) => setRascunho({ ...rascunho, [t.chave]: e.target.value })} />
              <span>
                <strong>{t.nome}</strong>
                <small className="muted">{t.dica}</small>
              </span>
              <code>{rascunho[t.chave]}</code>
            </label>
          ))}
        </div>

        <div className="tema-preview" aria-label="Prévia">
          <div className="coluna" style={{ "--cor-coluna": "#2563eb" } as React.CSSProperties}>
            <header className="coluna-topo">
              <span className="coluna-cor estatico" />
              <span className="coluna-nome">Fazendo</span>
              <span className="contagem">2</span>
            </header>
            <div className="coluna-cards">
              <PostItVisual card={{ id: 1, coluna_id: 0, titulo: "Revisar o layout", descricao: "Ver no celular também", cor: "#fde68a", prioridade: 2, posicao: "" }} />
              <PostItVisual card={{ id: 2, coluna_id: 0, titulo: "Pagar a conta de luz", descricao: "", cor: "#93c5fd", prioridade: 1, posicao: "" }} />
            </div>
          </div>
          <button className="btn btn-primario">Botão principal</button>
          <p className="erro">Mensagem de erro</p>
        </div>
      </div>

      <div className="acoes">
        <button className="btn" onClick={() => setRascunho({ ...TEMA_PADRAO })}>
          Restaurar padrão
        </button>
        <span className="espaco" />
        {msg && <span className="ok">{msg}</span>}
        <button className="btn" disabled={!alterado} onClick={() => setRascunho(completar(salvo.current))}>
          Descartar
        </button>
        <button className="btn btn-primario" disabled={!alterado} onClick={salvar}>
          Salvar tema
        </button>
      </div>
    </div>
  );
}
