// src/layout/DashboardLayout.jsx
import React, { useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import "./dashboard.css";

const NAV = [
  {
    group: "Geral",
    items: [
      { to: "/app/dashboard", label: "Visão Geral", icon: "▦" },
      { to: "/app/clients", label: "Clientes", icon: "👥" },
    ],
  },
  {
    group: "Operação",
    items: [
      { to: "/app/integrations", label: "Integrações (APIs)", icon: "🔗" },
      { to: "/app/plants", label: "Usinas", icon: "⚡" },
      { to: "/app/campo-tecnico", label: "Campo (Técnico)", icon: "🛠" },
      { to: "/app/client-portal", label: "Portal do Cliente", icon: "👤" },
    ],
  },
];


export default function DashboardLayout() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(true);

  const filteredNav = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return NAV;

    return NAV.map((g) => ({
      ...g,
      items: g.items.filter((i) => i.label.toLowerCase().includes(q)),
    })).filter((g) => g.items.length > 0);
  }, [search]);

  async function logout() {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="dash-root">
      <aside className={`dash-sidebar ${menuOpen ? "" : "collapsed"}`}>
        <div className="dash-brand">
          <div className="dash-logo">
            <img src="/logo.png" alt="Eletrobess" />
          </div>
          <div className="dash-brandText">
            <div className="dash-brandName">Eletrobess</div>
            <div className="dash-brandSub">Soluções</div>
          </div>
        </div>

        <div className="dash-sideSearch">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar itens..."
          />
        </div>

        <nav className="dash-nav">
          {filteredNav.map((g) => (
            <div key={g.group} className="dash-navGroup">
              <div className="dash-navGroupTitle">{g.group}</div>

              {g.items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  className={({ isActive }) =>
                    `dash-link ${isActive ? "active" : ""}`
                  }
                >
                  <span className="dash-ico">{it.icon}</span>
                  <span className="dash-label">{it.label}</span>
                  <span className="dash-chevron">›</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="dash-status">
          <div className="dash-statusCard">
            <div className="dash-statusIcon">⚡</div>
            <div>
              <div className="dash-statusTitle">Sistema online</div>
              <div className="dash-statusValue">100% operacional</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="dash-main">
        <header className="dash-topbar">
          <button
            className="dash-menuBtn"
            onClick={() => setMenuOpen((p) => !p)}
            type="button"
          >
            ☰
          </button>

          <div className="dash-topSearch">
            <input placeholder="Buscar usinas, clientes, projetos..." />
          </div>

          <div className="dash-topActions">
            <button className="dash-iconBtn" title="Notificações" type="button">
              🔔
            </button>
            <button
              className="dash-avatar"
              type="button"
              onClick={logout}
              title="Sair"
            >
              Sair
            </button>
          </div>
        </header>

        <div className="dash-content ">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
