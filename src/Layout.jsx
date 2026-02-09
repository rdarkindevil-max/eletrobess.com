import React, { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./auth/useAuth";
import "./styles.css";

export default function Layout({ currentPageName }) {
  const { loading, role } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  if (loading) {
    return <div style={{ padding: 20 }}>Carregando...</div>;
  }

  // ===== MENU NOVO =====
  // Antes de OPERAÇÃO: só "Clientes"
  // OPERAÇÃO: Integrações (APIs) + Usinas
  const navGroups = useMemo(() => {
    // portal do cliente
    if (role === "client") {
      return [
        {
          title: "PORTAL",
          items: [
            { name: "Portal do Cliente", page: "ClientPortal", to: "/app/client-portal" },
          ],
        },
      ];
    }

    // admin / staff
    return [
      {
        title: "GERAL",
        items: [{ name: "Clientes", page: "Clients", to: "/app/clients" }],
      },
      {
        title: "OPERAÇÃO",
        items: [
          { name: "Integrações (APIs)", page: "Integrations", to: "/app/integrations" },
          { name: "Usinas", page: "Plants", to: "/app/plants" },
        ],
      },
    ];
  }, [role]);

  const isActiveFallback = (item) => {
    if (currentPageName) return currentPageName === item.page;
    return location.pathname === item.to;
  };

  return (
    <div className="app">
      <aside className={"sidebar " + (sidebarOpen ? "open" : "closed")}>
        <div className="brand">
          <div className="brandLogo"></div>
          <div>
            <div className="brandName">Eletrobess</div>
            <div className="brandSub">Soluções</div>
          </div>
        </div>

        <nav className="nav">
          {navGroups.map((group) => (
            <div key={group.title} className="navGroup">
              <div className="navGroupTitle">{group.title}</div>

              {group.items.map((item) => (
                <NavLink
                  key={item.page}
                  to={item.to}
                  // NavLink já resolve o "active" sozinho
                  className={({ isActive }) => {
                    const active = isActive || isActiveFallback(item);
                    return "navItem " + (active ? "active" : "");
                  }}
                  end
                >
                  {item.name}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="iconBtn" onClick={() => setSidebarOpen((v) => !v)} type="button">
            ☰
          </button>

          <div className="searchWrap">
            <input className="search" placeholder="Buscar usinas, clientes, projetos..." />
          </div>

          <div className="topRight">
            <div className="avatar">{(role || "U")[0]?.toUpperCase()}</div>
          </div>
        </header>

        {/* aqui entra a página */}
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
