import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, token, type User } from "./api";
import { aplicarTema } from "./tema";

interface AuthCtx {
  user: User | null;
  carregando: boolean;
  entrar: (login: string, senha: string) => Promise<void>;
  sair: () => void;
  atualizar: (u: User) => void;
}

const Ctx = createContext<AuthCtx>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [carregando, setCarregando] = useState(Boolean(token.get()));

  useEffect(() => {
    if (!token.get()) return;
    api<User>("/me")
      .then((u) => {
        setUser(u);
        aplicarTema(u.tema);
      })
      .catch(() => token.limpar())
      .finally(() => setCarregando(false));
  }, []);

  async function entrar(login: string, senha: string) {
    const r = await api<{ token: string; user: User }>("/auth/login", { method: "POST", body: { login, senha } });
    token.set(r.token);
    setUser(r.user);
    aplicarTema(r.user.tema);
  }

  function sair() {
    token.limpar();
    setUser(null);
  }

  return (
    <Ctx.Provider value={{ user, carregando, entrar, sair, atualizar: setUser }}>{children}</Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
