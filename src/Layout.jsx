import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./styles.css";

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navItems = [{ name: "Clientes", page: "Clients", to: "/clients" }];

  return (
    <div className="app">
      <aside className={"sidebar " + (sidebarOpen ? "open" : "closed")}>
        <div className="brand">
          {/* LOGO (sidebar) */}
         <div className="brandLogo">
  <img src="/logo.png" />
</div>


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

        <div className="sidebarFooter">
          <div className="statusCard">
            <div className="statusDot" />
            <div>
              <div className="statusTitle">Sistema online</div>
              <div className="statusSub">100% operacional</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button
            className="iconBtn"
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
          >
            ☰
          </button>

          <div className="searchWrap">
            <input
              className="search"
              placeholder="Buscar usinas, clientes, projetos..."
            />
          </div>

          <div className="topRight">
            <button className="iconBtn" type="button">
              🔔
            </button>

            {/* LOGO (avatar topo) */}
          <img src="/logo.png" />
          </div>
        </header>

        <main className="content">{children}</main>
      </div>
    </div>
  );
}

