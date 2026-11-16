import { useState, type FormEvent } from "react";
import { api, token, type User } from "../api";
import { useAuth } from "../auth";

export function Perfil() {
  const { user, atualizar, sair } = useAuth();
  const [nome, setNome] = useState(user!.nome);
  const [email, setEmail] = useState(user!.email);
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  async function tentar(fn: () => Promise<void>, sucesso: string) {
    setMsg(null);
    try {
      await fn();
      setMsg({ ok: true, texto: sucesso });
    } catch (e) {
      setMsg({ ok: false, texto: (e as Error).message });
    }
  }

  function salvarDados(e: FormEvent) {
    e.preventDefault();
    tentar(async () => atualizar(await api<User>("/me", { method: "PUT", body: { nome, email } })), "Dados salvos");
  }

  function trocarSenha(e: FormEvent) {
    e.preventDefault();
    tentar(async () => {
      // A troca derruba as outras sessões; esta continua com o token novo
      const r = await api<{ token: string }>("/me/senha", { method: "PUT", body: { atual, nova } });
      token.set(r.token);
      setAtual("");
      setNova("");
    }, "Senha alterada. As outras sessões foram encerradas");
  }

  return (
    <div className="pagina-estreita">
      <h1>Perfil</h1>
      {msg && <p className={msg.ok ? "ok" : "erro"}>{msg.texto}</p>}

      <form className="form painel" onSubmit={salvarDados}>
        <h2>Dados</h2>
        <label>
          Nome
          <input required maxLength={80} value={nome} onChange={(e) => setNome(e.target.value)} />
        </label>
        <label>
          Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <div className="acoes">
          <span className="espaco" />
          <button className="btn btn-primario">Salvar</button>
        </div>
      </form>

      <form className="form painel" onSubmit={trocarSenha}>
        <h2>Senha</h2>
        <label>
          Senha atual
          <input type="password" autoComplete="current-password" required value={atual} onChange={(e) => setAtual(e.target.value)} />
        </label>
        <label>
          Nova senha
          <input type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={nova} onChange={(e) => setNova(e.target.value)} />
        </label>
        <div className="acoes">
          <span className="espaco" />
          <button className="btn btn-primario">Trocar senha</button>
        </div>
      </form>

      <button className="btn btn-perigo" onClick={sair}>
        Sair
      </button>
    </div>
  );
}
