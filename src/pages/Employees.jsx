import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import "../styles.css";

function Badge({ children }) {
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 800,
        padding: "4px 10px",
        borderRadius: 999,
        border: "1px solid rgba(0,0,0,.10)",
        background: "rgba(255,255,255,.7)",
      }}
    >
      {children}
    </span>
  );
}

function RoleBadge({ role }) {
  const r = (role || "client").toLowerCase();
  const label = r;
  const bg =
    r === "admin"
      ? "rgba(255, 215, 0, .18)"
      : r === "staff"
      ? "rgba(42, 211, 162, .16)"
      : "rgba(148, 163, 184, .18)";

  const bd =
    r === "admin"
      ? "rgba(255, 215, 0, .35)"
      : r === "staff"
      ? "rgba(42, 211, 162, .30)"
      : "rgba(148, 163, 184, .30)";

  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 900,
        padding: "4px 10px",
        borderRadius: 999,
        border: `1px solid ${bd}`,
        background: bg,
        textTransform: "lowercase",
      }}
      title="Cargo de acesso"
    >
      {label}
    </span>
  );
}

export default function Employees() {
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  const [employees, setEmployees] = useState([]); // {id,email,name,status,role}
  const [q, setQ] = useState("");

  const [myId, setMyId] = useState(null);

  const loadEmployees = async () => {
    setErrMsg("");
    setLoading(true);

    // pega meu user id
    const { data: auth } = await supabase.auth.getUser();
    setMyId(auth?.user?.id || null);

    // 1) pega employees
    const { data: emp, error: empErr } = await supabase
      .from("employees")
      .select("id, email, name, status, created_at")
      .order("created_at", { ascending: false });

    if (empErr) {
      setErrMsg(empErr.message);
      setEmployees([]);
      setLoading(false);
      return;
    }

    // 2) pega roles do profiles
    const ids = (emp || []).map((e) => e.id).filter(Boolean);

    let rolesMap = {};
    if (ids.length > 0) {
      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("id, role")
        .in("id", ids);

      if (!profErr && Array.isArray(prof)) {
        rolesMap = prof.reduce((acc, p) => {
          acc[p.id] = p.role || "client";
          return acc;
        }, {});
      }
    }

    const merged = (emp || []).map((e) => ({
      ...e,
      role: rolesMap[e.id] || "client",
    }));

    setEmployees(merged);
    setLoading(false);
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return employees;

    return (employees || []).filter((e) => {
      const hay = [e.name, e.email, e.status, e.role].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(qq);
    });
  }, [employees, q]);

  const activeCount = useMemo(
    () => filtered.filter((e) => (e.status || "ATIVO") === "ATIVO").length,
    [filtered]
  );
  const inactiveCount = useMemo(
    () => filtered.filter((e) => (e.status || "ATIVO") === "INATIVO").length,
    [filtered]
  );

  const toggleStatus = async (emp) => {
    // não deixa desativar você mesmo
    if (myId && emp.id === myId) {
      alert("Você não pode desativar sua própria conta.");
      return;
    }

    const next = (emp.status || "ATIVO") === "ATIVO" ? "INATIVO" : "ATIVO";
    if (!confirm(`Mudar status de ${emp.email} para ${next}?`)) return;

    const { error } = await supabase.from("employees").update({ status: next }).eq("id", emp.id);

    if (error) {
      alert("Erro ao atualizar: " + error.message);
      return;
    }

    await loadEmployees();
  };

  // ✅ mudar role (admin/staff/client)
  const changeRole = async (emp, newRole) => {
    // não deixa rebaixar você mesmo de admin pra não se trancar
    if (myId && emp.id === myId && newRole !== "admin") {
      alert("Você não pode tirar o seu próprio admin.");
      return;
    }

    if (!confirm(`Mudar role de ${emp.email} para ${newRole}?`)) return;

    const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", emp.id);

    if (error) {
      alert("Erro ao atualizar role: " + error.message);
      return;
    }

    await loadEmployees();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-6xl px-6 py-6">
        <div className="pageHeader2">
          <div>
            <h1 className="pageTitle2">Funcionários</h1>
            <p className="pageSubtitle2">Lista, status e cargos (staff/admin)</p>
          </div>

          <div className="headerActions2">
            <button className="btn ghost" type="button" onClick={loadEmployees}>
              Atualizar
            </button>
          </div>
        </div>

        {errMsg ? (
          <div className="warn" style={{ marginTop: 12 }}>
            Erro: {errMsg}
          </div>
        ) : null}

        {/* KPIs */}
        <div className="kpiGrid2">
          <div className="kpiCard2">
            <div className="kpiIcon2">🧑‍💼</div>
            <div>
              <div className="kpiLabel2">Total</div>
              <div className="kpiValue2">{filtered.length}</div>
            </div>
          </div>

          <div className="kpiCard2">
            <div className="kpiIcon2">✅</div>
            <div>
              <div className="kpiLabel2">Ativos</div>
              <div className="kpiValue2">{activeCount}</div>
            </div>
          </div>

          <div className="kpiCard2">
            <div className="kpiIcon2">⛔</div>
            <div>
              <div className="kpiLabel2">Inativos</div>
              <div className="kpiValue2">{inactiveCount}</div>
            </div>
          </div>
        </div>

        {/* Busca */}
        <div className="searchBar2">
          <div className="searchInputWrap2">
            <span className="searchIcon2">🔎</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome, email, role, status..."
              className="searchInput2"
            />
          </div>
        </div>

        {/* Lista */}
        <div className="tableCard2">
          <div className="tableHead2">
            <div className="tableTitle2">Equipe</div>
            <div className="tableMeta2">{loading ? "Carregando..." : `${filtered.length} resultado(s)`}</div>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="empty2">Carregando funcionários...</div>
            ) : filtered.length === 0 ? (
              <div className="empty2">Nenhum funcionário encontrado.</div>
            ) : (
              <div className="clientsList">
                {filtered.map((e) => {
                  const status = e.status || "ATIVO";
                  const statusKey = status.toLowerCase();
                  const isMe = myId && e.id === myId;

                  return (
                    <div key={e.id} className="clientCard2">
                      <div className="clientTop2">
                        <div className="clientLeft2">
                          <div className="avatar2">{(e.name || e.email || "F")[0]?.toUpperCase()}</div>

                          <div className="clientText2">
                            <div className="clientName2">
                              {e.name || "-"} {isMe ? <span style={{ opacity: 0.7 }}>(você)</span> : null}
                            </div>
                            <div className="clientEmail2">{e.email || ""}</div>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <RoleBadge role={e.role} />
                          <span className={`badge2 badge-${statusKey}`}>
                            {statusKey === "ativo" ? "ATIVO" : statusKey}
                          </span>
                        </div>
                      </div>

                      <div className="clientMeta2">
                        <div className="chip2">
                          Criado em: {e.created_at ? new Date(e.created_at).toLocaleDateString("pt-BR") : "-"}
                        </div>
                        <div className="chip2">
                          <Badge>ID</Badge> <span style={{ opacity: 0.75 }}>{String(e.id).slice(0, 8)}…</span>
                        </div>
                      </div>

                      {/* ✅ AÇÕES */}
                      <div className="clientActions2" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button className="btn ghost" type="button" onClick={() => toggleStatus(e)}>
                          {status === "ATIVO" ? "Desativar" : "Ativar"}
                        </button>

                        <button className="btn ghost" type="button" onClick={() => changeRole(e, "staff")}>
                          Staff
                        </button>

                        <button className="btn ghost" type="button" onClick={() => changeRole(e, "admin")}>
                          Admin
                        </button>

                        <button className="btn ghost" type="button" onClick={() => changeRole(e, "client")}>
                          Cliente
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t px-4 py-3 text-xs text-muted-foreground">
            Dica: use a busca para achar por e-mail rápido. Role vem do <b>profiles</b>.
          </div>
        </div>
      </div>
    </div>
  );
}
