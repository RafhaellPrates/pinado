import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { Logo } from "../components/Layout";

export function Login() {
  const { entrar } = useAuth();
  const navigate = useNavigate();
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro("");
    try {
      await entrar(login.trim(), senha);
      navigate("/", { replace: true });
    } catch (err) {
      setErro((err as Error).message);
      setEnviando(false);
    }
  }

  return (
    <div className="login">
      <form className="login-card form" onSubmit={enviar}>
        <Logo />
        <p className="muted">Entre pra ver seus quadros.</p>
        <label>
          Email ou nome
          <input autoFocus autoComplete="username" value={login} onChange={(e) => setLogin(e.target.value)} />
        </label>
        <label>
          Senha
          <input type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
        </label>
        {erro && <p className="erro">{erro}</p>}
        <button className="btn btn-primario btn-largo" disabled={enviando || !login || !senha}>
          {enviando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
