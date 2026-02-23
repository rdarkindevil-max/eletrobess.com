// src/layout/DashboardLayout.jsx
import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { logActivity } from "../lib/logActivity";
import "./dashboard.css";

// ✅ dedupe por sessão do browser + evento
function makeDedupeKey(type, userId) {
  const sidKey = "activity_session_id";
  let sid = sessionStorage.getItem(sidKey);

  if (!sid) {
    sid = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    sessionStorage.setItem(sidKey, sid);
  }

  return `${String(type).toUpperCase()}:${userId || "anon"}:${sid}`;
}

// ✅ dedupe exclusivo pra LOGOUT (pra não “sumir” por duplicado)
function makeLogoutDedupeKey(userId) {
  const k = "activity_logout_seq";
  const n = (Number(sessionStorage.getItem(k) || "0") || 0) + 1;
  sessionStorage.setItem(k, String(n));
  return `LOGOUT:${userId || "anon"}:${Date.now()}:${n}`;
}

export default function DashboardLayout() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(true);

  const [role, setRole] = useState("client");
  const [loadingRole, setLoadingRole] = useState(true);

  const [loggingOut, setLoggingOut] = useState(false);

  // ✅ Carrega role do usuário (profiles.role)
  useEffect(() => {
    let alive = true;

    (async () => {
      setLoadingRole(true);

      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;

      if (!user) {
        if (alive) {
          setRole("client");
          setLoadingRole(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!alive) return;

      setRole(error ? "client" : data?.role || "client");
      setLoadingRole(false);
    })();

    return () => {
      alive = false;
    };
  }, []);

  const isClient = role === "client";
  const isAdmin = role === "admin";

  // ✅ NAV baseado no role
  const NAV = useMemo(() => {
    if (isClient) {
      return [
        {
          group: "Cliente",
          items: [{ to: "/app/client-portal", label: "Portal do Cliente", icon: "👤" }],
        },
      ];
    }

    const base = [
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
          { to: "/app/plants", label: "Usinas", icon: "⚡" },
          { to: "/app/campo-tecnico", label: "Campo (Técnico)", icon: "🛠" },
          { to: "/app/client-portal", label: "Portal do Cliente", icon: "👤" },
          { to: "/app/employee-invites", label: "Convites (Funcionários)", icon: "📨" },
          { to: "/app/logs", label: "Logs (Acessos)", icon: "🧾" },
        ],
      },
    ];

    if (isAdmin) {
      base.splice(1, 0, {
        group: "Admin",
        items: [
          { to: "/app/employees", label: "Funcionários", icon: "🧑‍💼" },
          { to: "/app/integrations", label: "Integrações (APIs)", icon: "🔗" },
        ],
      });
    }

    return base;
  }, [isClient, isAdmin]);

  const filteredNav = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return NAV;

    return NAV
      .map((g) => ({
        ...g,
        items: g.items.filter((i) => i.label.toLowerCase().includes(q)),
      }))
      .filter((g) => g.items.length > 0);
  }, [search, NAV]);

  // ✅ LOGOUT 100%: loga antes + dedupeKey SEM repetição + não bloqueia
  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      // pega sessão ANTES do signOut (pra ter userId/email)
      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user || null;

      const userId = user?.id || null;
      const email = user?.email || null;

      // ✅ se não tiver user, não tenta logar (evita erro de RLS)
      if (userId) {
        await logActivity("LOGOUT", {
          userId,
          email,
          // ⚠️ aqui está a correção: dedupeKey sempre nova
          dedupeKey: makeLogoutDedupeKey(userId),
          extra: { source: "dashboard_logout_button" },
        });
      }
    } catch (e) {
      console.warn("Falha ao registrar LOGOUT:", e?.message || e);
      // não bloqueia o logout
    }

    try {
      await supabase.auth.signOut();
    } finally {
      navigate("/login", { replace: true });
      setLoggingOut(false);
    }
  }

  if (loadingRole) {
    return (
      <div className="dash-root">
        <main className="dash-main">
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
          </div>
        </main>
      </div>
    );
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
                  className={({ isActive }) => `dash-link ${isActive ? "active" : ""}`}
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
              <div className="dash-statusTitle">
                {isClient ? "Área do Cliente" : "Sistema online"}
              </div>
              <div className="dash-statusValue">
                {isClient ? "Acesso restrito ao portal" : "100% operacional"}
              </div>
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
              disabled={loggingOut}
              style={{ opacity: loggingOut ? 0.7 : 1 }}
            >
              {loggingOut ? "Saindo..." : "Sair"}
            </button>
          </div>
        </header>

        <div className="dash-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}