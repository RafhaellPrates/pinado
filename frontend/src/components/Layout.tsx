import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth";

export function Logo() {
  return (
    <span className="logo">
      <img src="/pin.svg" alt="" width={24} height={24} />
      Pinado
    </span>
  );
}

export function Layout() {
  const { user } = useAuth();
  return (
    <div className="app">
      <header className="topo">
        <NavLink to="/" className="topo-logo">
          <Logo />
        </NavLink>
        <nav className="topo-nav">
          <NavLink to="/" end>
            Projetos
          </NavLink>
          <NavLink to="/tema">Tema</NavLink>
          <NavLink to="/perfil" className="topo-user" title="Perfil">
            <span className="avatar">{user?.nome.slice(0, 1).toUpperCase()}</span>
            <span className="topo-nome">{user?.nome}</span>
          </NavLink>
        </nav>
      </header>
      <main className="conteudo">
        <Outlet />
      </main>
    </div>
  );
}
