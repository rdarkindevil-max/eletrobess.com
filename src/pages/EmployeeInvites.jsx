import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Employees() {
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [errMsg, setErrMsg] = useState("");
  const [q, setQ] = useState("");

  const [items, setItems] = useState([]);

  // menu de 3 pontinhos
  const [menuOpenId, setMenuOpenId] = useState(null);

  useEffect(() => {
    const onClick = (e) => {
      if (e.target.closest(".kebab-wrap")) return;
      setMenuOpenId(null);
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  const load = async () => {
    setLoading(true);
    setErrMsg("");
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (e) {
      setErrMsg(e?.message || "Erro ao carregar funcionários");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const norm = (s) => String(s || "").trim().toLowerCase();

  const filtered = useMemo(() => {
    const term = norm(q);
    if (!term) return items;

    return items.filter((x) => {
      const hay = [x.name, x.email, x.role, x.status, x.id].map(norm).join(" ");
      return hay.includes(term);
    });
  }, [items, q]);

  const total = filtered.length;
  const activeCount = filtered.filter(
    (x) => String(x.status || "").toUpperCase() !== "INACTIVE"
  ).length;
  const inactiveCount = total - activeCount;

  const roleLabel = (r) => {
    const rr = String(r || "").toLowerCase();
    if (rr === "admin") return "admin";
    if (rr === "client") return "client";
    return "staff";
  };

  const statusLabel = (s) => {
    const ss = String(s || "").toUpperCase();
    return ss === "INACTIVE" ? "INATIVO" : "ATIVO";
  };

  const statusTone = (s) => {
    const ss = String(s || "").toUpperCase();
    return ss === "INACTIVE" ? "bad" : "ok";
  };

  const setRole = async (emp, newRole) => {
    if (!emp?.id) return;
    if (!confirm(`Trocar cargo de "${emp.email}" para "${newRole}"?`)) return;

    setSavingId(emp.id);
    setErrMsg("");
    try {
      const { error } = await supabase
        .from("employees")
        .update({ role: newRole })
        .eq("id", emp.id);

      if (error) throw error;
      await load();
    } catch (e) {
      setErrMsg(e?.message || "Erro ao trocar cargo");
    } finally {
      setSavingId(null);
      setMenuOpenId(null);
    }
  };

  const toggleActive = async (emp) => {
    if (!emp?.id) return;

    const now = String(emp.status || "").toUpperCase();
    const next = now === "INACTIVE" ? "ACTIVE" : "INACTIVE";

    if (!confirm(`${next === "INACTIVE" ? "Desativar" : "Reativar"} "${emp.email}"?`))
      return;

    setSavingId(emp.id);
    setErrMsg("");
    try {
      const { error } = await supabase
        .from("employees")
        .update({ status: next })
        .eq("id", emp.id);

      if (error) throw error;
      await load();
    } catch (e) {
      setErrMsg(e?.message || "Erro ao alterar status");
    } finally {
      setSavingId(null);
      setMenuOpenId(null);
    }
  };

  const Badge = ({ children, tone = "default" }) => {
    const map = {
      default: {
        bg: "rgba(2, 132, 199, .12)",
        fg: "#075985",
        bd: "rgba(2,132,199,.28)",
      },
      ok: {
        bg: "rgba(16, 185, 129, .14)",
        fg: "#047857",
        bd: "rgba(16,185,129,.28)",
      },
      bad: {
        bg: "rgba(239, 68, 68, .14)",
        fg: "#991b1b",
        bd: "rgba(239,68,68,.28)",
      },
      gray: {
        bg: "rgba(100,116,139,.14)",
        fg: "#334155",
        bd: "rgba(100,116,139,.28)",
      },
      warn: {
        bg: "rgba(245, 158, 11, .14)",
        fg: "#92400e",
        bd: "rgba(245,158,11,.28)",
      },
    };
    const t = map[tone] || map.default;
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "6px 12px",
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 900,
          background: t.bg,
          color: "#000", // força legível
          border: `1px solid ${t.bd}`,
          whiteSpace: "nowrap",
          opacity: 1,
        }}
      >
        <span style={{ color: t.fg, fontWeight: 900 }}>{children}</span>
      </span>
    );
  };

  const RoleBadge = ({ role }) => {
    const r = roleLabel(role);
    if (r === "admin") return <Badge tone="warn">admin</Badge>;
    if (r === "client") return <Badge tone="default">client</Badge>;
    return <Badge tone="ok">staff</Badge>;
  };

  // ✅ ALTERADO: agora aceita icon
  const StatCard = ({ title, value, icon }) => (
    <div
      className="panel"
      style={{
        padding: 14,
        borderRadius: 16,
        display: "flex",
        alignItems: "center",
        gap: 12,
        minHeight: 70,
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          background: "rgba(0,0,0,.06)",
          display: "grid",
          placeItems: "center",
          fontSize: 18,
          fontWeight: 900,
          color: "#000",
          flex: "0 0 auto",
        }}
        aria-hidden="true"
      >
        {icon}
      </div>
      <div style={{ lineHeight: 1.1 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "rgba(0,0,0,.55)" }}>
          {title}
        </div>
        <div style={{ fontSize: 22, fontWeight: 1000, color: "#000" }}>{value}</div>
      </div>
    </div>
  );

  return (
    <div style={{ padding: 24, color: "#000" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, fontSize: 34, fontWeight: 1000, color: "#000" }}>
          Funcionários
        </h1>
        <span style={{ fontWeight: 800, color: "rgba(0,0,0,.55)" }}>
          Lista, status e cargos (staff/admin/client)
        </span>
      </div>

      {errMsg ? (
        <div className="warn" style={{ marginTop: 12 }}>
          Erro: {errMsg}
        </div>
      ) : null}

      {/* ✅ ALTERADO: adiciona ícones */}
      <div
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 14,
          maxWidth: 920,
        }}
      >
        <StatCard icon="👥" title="Total" value={total} />
        <StatCard icon="✅" title="Ativos" value={activeCount} />
        <StatCard icon="⛔" title="Inativos" value={inactiveCount} />
      </div>

      <div style={{ marginTop: 16, maxWidth: 920 }}>
        <input
          className="input"
          placeholder="Buscar por nome, email, role, status..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ width: "100%" }}
        />
      </div>

      <div
        className="panel"
        style={{ marginTop: 16, padding: 0, borderRadius: 16, maxWidth: 1120 }}
      >
        <div
          style={{
            padding: "14px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontWeight: 1000, color: "#000" }}>Equipe</div>
          <div style={{ fontSize: 12, fontWeight: 800, color: "rgba(0,0,0,.55)" }}>
            {filtered.length} resultado(s)
          </div>
        </div>

        <div style={{ padding: 16, display: "grid", gap: 12 }}>
          {loading ? (
            <div style={{ fontWeight: 900, color: "#000" }}>Carregando...</div>
          ) : filtered.length === 0 ? (
            <div style={{ fontWeight: 900, color: "rgba(0,0,0,.55)" }}>
              Nenhum funcionário encontrado.
            </div>
          ) : (
            filtered.map((emp) => {
              const email = emp.email || "-";
              const created = emp.created_at
                ? new Date(emp.created_at).toLocaleDateString("pt-BR")
                : "-";
              const status = String(emp.status || "").toUpperCase();

              return (
                <div
                  key={emp.id}
                  style={{
                    border: "1px solid rgba(0,0,0,.10)",
                    borderRadius: 16,
                    padding: 16,
                    background: "#fff",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 999,
                        background: "rgba(22,163,74,.12)",
                        border: "1px solid rgba(22,163,74,.25)",
                        display: "grid",
                        placeItems: "center",
                        fontWeight: 1000,
                        color: "#065f46",
                        flex: "0 0 auto",
                      }}
                    >
                      {String((emp.name || email)[0] || "U").toUpperCase()}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 1000,
                          color: "#000",
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: 420,
                          }}
                        >
                          {emp.name ? emp.name : email.split("@")[0]}
                        </span>
                        {emp.is_me ? (
                          <span style={{ fontWeight: 900, color: "rgba(0,0,0,.55)" }}>
                            (você)
                          </span>
                        ) : null}
                      </div>

                      <div style={{ fontSize: 13, fontWeight: 800, color: "rgba(0,0,0,.55)" }}>
                        {email}
                      </div>

                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                          alignItems: "center",
                        }}
                      >
                        <span className="badge" style={{ color: "#000", opacity: 1 }}>
                          Criado em: <b style={{ color: "#000" }}>{created}</b>
                        </span>
                        <span className="badge" style={{ color: "#000", opacity: 1 }}>
                          ID <b style={{ color: "#000" }}>{String(emp.id || "").slice(0, 8)}…</b>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      flexWrap: "wrap",
                      justifyContent: "flex-end",
                    }}
                  >
                    {/* cargo atual visível */}
                    <RoleBadge role={emp.role} />

                    {/* status */}
                    <Badge tone={statusTone(status)}>{statusLabel(status)}</Badge>

                    {/* menu 3 pontinhos */}
                    <div className="kebab-wrap" style={{ position: "relative" }}>
                      <button
                        type="button"
                        className="kebab-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(menuOpenId === emp.id ? null : emp.id);
                        }}
                        title="Ações"
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          border: "1px solid rgba(0,0,0,.12)",
                          background: "#fff",
                          color: "#000",
                          fontWeight: 1000,
                          fontSize: 22,
                          cursor: "pointer",
                          display: "grid",
                          placeItems: "center",
                        }}
                        disabled={savingId === emp.id}
                      >
                        ⋯
                      </button>

                      {menuOpenId === emp.id && (
                        <div
                          className="kebab-menu"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            position: "absolute",
                            right: 0,
                            top: "calc(100% + 8px)",
                            minWidth: 200,
                            background: "#fff",
                            border: "1px solid rgba(0,0,0,.12)",
                            borderRadius: 14,
                            boxShadow: "0 16px 40px rgba(0,0,0,.12)",
                            padding: 8,
                            zIndex: 9999,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => toggleActive(emp)}
                            disabled={savingId === emp.id}
                            style={menuItemStyle(true)}
                          >
                            {status === "INACTIVE" ? "Reativar" : "Desativar"}
                          </button>

                          <div style={{ height: 1, background: "rgba(0,0,0,.08)", margin: "8px 4px" }} />

                          <button
                            type="button"
                            onClick={() => setRole(emp, "staff")}
                            disabled={savingId === emp.id}
                            style={menuItemStyle(false)}
                          >
                            Staff
                          </button>
                          <button
                            type="button"
                            onClick={() => setRole(emp, "admin")}
                            disabled={savingId === emp.id}
                            style={menuItemStyle(false)}
                          >
                            Admin
                          </button>
                          <button
                            type="button"
                            onClick={() => setRole(emp, "client")}
                            disabled={savingId === emp.id}
                            style={menuItemStyle(false)}
                          >
                            Cliente
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div
          style={{
            padding: 14,
            borderTop: "1px solid rgba(0,0,0,.08)",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button className="btn ghost" type="button" onClick={load} disabled={loading}>
            Atualizar
          </button>
        </div>
      </div>
    </div>
  );
}

function menuItemStyle(isDanger) {
  return {
    width: "100%",
    padding: "10px 10px",
    borderRadius: 12,
    background: "transparent",
    border: "1px solid transparent",
    fontWeight: 1000,
    color: isDanger ? "#991b1b" : "#000",
    cursor: "pointer",
    textAlign: "left",
  };
}