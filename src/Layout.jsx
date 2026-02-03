import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "./auth/useAuth";
import "./styles.css";

export default function Layout({ children, currentPageName }) {
  const { loading, role } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (loading) {
    return <div style={{ padding: 20 }}>Carregando...</div>;
  }

  const navItems =
    role === "client"
      ? [{ name: "Portal do Cliente", page: "ClientPortal", to: "/client" }]
      : [
          { name: "Clientes", page: "Clients", to: "/clients" },
          { name: "Usinas", page: "PowerPlants", to: "/plants" },
          { name: "APIs", page: "Apis", to: "/apis" },
        ];

  return (
    <div className="app">
      <aside className={"sidebar " + (sidebarOpen ? "open" : "closed")}>
        <div className="brand">
          <div className="brandLogo">EB</div>
          <div>
            <div className="brandName">Eletrobess</div>
            <div className="brandSub">Soluções</div>
          </div>
        </div>

        <nav className="nav">
          {navItems.map((item) => {
            const active = currentPageName === item.page;
            return (
              <Link
                key={item.page}
                className={"navItem " + (active ? "active" : "")}
                to={item.to}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="iconBtn" onClick={() => setSidebarOpen((v) => !v)}>
            ☰
          </button>
          <div className="searchWrap">
            <input className="search" placeholder="Buscar..." />
          </div>
          <div className="topRight">
            <div className="avatar">{(role || "U").toUpperCase()}</div>
          </div>
        </header>

        <main className="content">{children}</main>
      </div>
    </div>
  );
}
