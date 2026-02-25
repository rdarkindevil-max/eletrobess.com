import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function EmployeeInvites() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("staff");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const [invites, setInvites] = useState([]);

  // ✅ Funcionários (membros)
  const [members, setMembers] = useState([]);
  const [membersSource, setMembersSource] = useState("employees"); // "employees" | "invites_accepted"

  // ✅ UI
  const [view, setView] = useState("employees"); // "employees" | "invites"

  const isValidEmail = useMemo(() => {
    const e = String(email || "").trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  }, [email]);

  const roleClass = (r) => {
    const x = String(r || "").toLowerCase();
    if (x === "admin") return "admin";
    if (x === "client") return "client";
    return "staff";
  };

  const memberStatusKey = (s) => {
    const st = String(s || "").toUpperCase();
    if (st === "INACTIVE" || st === "DISABLED") return "INACTIVE";
    return "ACTIVE";
  };

  const loadInvites = async () => {
    const { data, error } = await supabase
      .from("employee_invites")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  };

  /**
   * ✅ Funcionários “de verdade”
   * - Primeiro tenta buscar na tabela employees (recomendado)
   * - Se não existir / der erro, fallback:
   *   mostra os ACCEPTED da employee_invites como “funcionários”
   */
  const loadMembers = async () => {
    // 1) tenta employees
    const { data: empData, error: empErr } = await supabase
      .from("employees")
      .select("*")
      .order("created_at", { ascending: false });

    if (!empErr) {
      setMembersSource("employees");
      return empData || [];
    }

    // 2) fallback: ACCEPTED da invites
    const { data: invAcc, error: invAccErr } = await supabase
      .from("employee_invites")
      .select("*")
      .eq("status", "ACCEPTED")
      .order("created_at", { ascending: false });

    if (invAccErr) throw invAccErr;

    setMembersSource("invites_accepted");

    // normaliza
    return (invAcc || []).map((x) => ({
      id: x.id,
      email: x.email,
      role: x.role,
      status: "ACTIVE",
      created_at: x.created_at,
      source: "invite",
    }));
  };

  const loadAll = async () => {
    setErrMsg("");
    setLoading(true);
    try {
      const [inv, mem] = await Promise.all([loadInvites(), loadMembers()]);
      setInvites(inv);
      setMembers(mem);
    } catch (e) {
      setErrMsg(e?.message || "Erro ao carregar");
      setInvites([]);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const createInvite = async () => {
    const e = String(email || "").trim().toLowerCase();
    if (!isValidEmail) return alert("Email inválido.");

    setSaving(true);
    setErrMsg("");

    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id || null;

    const { error } = await supabase.from("employee_invites").insert({
      email: e,
      role,
      status: "PENDING",
      created_by: userId,
    });

    setSaving(false);

    if (error) {
      setErrMsg(error.message);
      return;
    }

    setEmail("");
    setRole("staff");
    await loadAll();
    setView("invites");
  };

  // ✅ revogar individual (PENDING ou ACCEPTED)
  const revokeInvite = async (id, currentStatus) => {
    const st = String(currentStatus || "").toUpperCase();
    const msg =
      st === "ACCEPTED"
        ? "Esse usuário já ACEITOU. Revogar aqui vai marcar como REVOKED. Continuar?"
        : "Revogar convite?";

    if (!confirm(msg)) return;

    const { error } = await supabase
      .from("employee_invites")
      .update({ status: "REVOKED" })
      .eq("id", id);

    if (error) {
      setErrMsg(error.message);
      return;
    }
    await loadAll();
  };

  // ✅ revogar TODOS os pendentes
  const revokeAllPending = async () => {
    if (!confirm("Revogar TODOS os convites PENDENTES?")) return;

    setSaving(true);
    setErrMsg("");

    const { error } = await supabase
      .from("employee_invites")
      .update({ status: "REVOKED" })
      .eq("status", "PENDING");

    setSaving(false);

    if (error) {
      setErrMsg(error.message);
      return;
    }
    await loadAll();
  };

  // ✅ revogar TODOS (PENDING + ACCEPTED + qualquer coisa que não seja REVOKED)
  const revokeAllInvites = async () => {
    if (!confirm("Revogar TODOS os convites (inclui ACCEPTED)?")) return;

    setSaving(true);
    setErrMsg("");

    const { error } = await supabase
      .from("employee_invites")
      .update({ status: "REVOKED" })
      .neq("status", "REVOKED");

    setSaving(false);

    if (error) {
      setErrMsg(error.message);
      return;
    }
    await loadAll();
  };

  // ✅ remover funcionário (de verdade)
  // - Se a fonte for employees: delete na tabela employees
  // - Se a fonte for fallback: marca invite ACCEPTED como REVOKED
  const removeMember = async (m) => {
    const em = m?.email || "";
    const msg =
      membersSource === "employees"
        ? `Remover funcionário "${em}"? Isso vai APAGAR da tabela employees.`
        : `Remover "${em}"? Isso vai marcar o registro ACCEPTED como REVOKED (fallback).`;

    if (!confirm(msg)) return;

    setSaving(true);
    setErrMsg("");

    if (membersSource === "employees") {
      const { error } = await supabase.from("employees").delete().eq("id", m.id);
      setSaving(false);

      if (error) {
        setErrMsg(error.message);
        return;
      }

      await loadAll();
      return;
    }

    const { error } = await supabase
      .from("employee_invites")
      .update({ status: "REVOKED" })
      .eq("id", m.id);

    setSaving(false);

    if (error) {
      setErrMsg(error.message);
      return;
    }

    await loadAll();
  };

  const InviteStatusBadge = ({ s }) => {
    const st = String(s || "").toUpperCase();
    const cls =
      st === "PENDING" ? "badge" :
      st === "ACCEPTED" ? "badge" :
      st === "REVOKED" ? "badge" : "badge";

    // deixa o texto sempre preto pelo teu CSS
    return <span className={cls}>{st || "—"}</span>;
  };

  const hasPending = invites.some((i) => String(i.status).toUpperCase() === "PENDING");
  const hasNotRevoked = invites.some((i) => String(i.status).toUpperCase() !== "REVOKED");

  return (
    <div className="p-6 employee-page" style={{ opacity: 1, filter: "none" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>
          Convites de Funcionários
        </h1>
        <span style={{ color: "var(--muted)", fontWeight: 700 }}>
          Adicionar emails e controlar acessos
        </span>
      </div>

      {errMsg ? (
        <div className="warn" style={{ marginTop: 12 }}>
          Erro: {errMsg}
        </div>
      ) : null}

      {/* Form add invite */}
      <div
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "1fr 180px 140px",
          gap: 10,
          maxWidth: 820,
        }}
      >
        <input
          className="input"
          placeholder="email@dominio.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="staff">staff</option>
          <option value="admin">admin</option>
          <option value="client">client</option>
        </select>

        <button
          className="btn primary"
          type="button"
          onClick={createInvite}
          disabled={!isValidEmail || saving}
        >
          {saving ? "Salvando..." : "Adicionar"}
        </button>
      </div>

      <div style={{ marginTop: 10, color: "var(--muted)", fontSize: 13, fontWeight: 700 }}>
        * Isso só registra o convite. (Se quiser, dá pra integrar e-mail automático depois.)
      </div>

      {/* Tabs */}
      <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          className={"btn " + (view === "employees" ? "primary" : "ghost")}
          onClick={() => setView("employees")}
        >
          Funcionários ({members.length})
        </button>

        <button
          type="button"
          className={"btn " + (view === "invites" ? "primary" : "ghost")}
          onClick={() => setView("invites")}
        >
          Convites ({invites.length})
        </button>

        <button className="btn ghost" type="button" onClick={loadAll}>
          Atualizar lista
        </button>

        {view === "employees" && (
          <span style={{ alignSelf: "center", color: "var(--muted)", fontSize: 12, fontWeight: 800 }}>
            Fonte: {membersSource === "employees" ? "employees" : "employee_invites (ACCEPTED)"}
          </span>
        )}

        {/* Ações em massa */}
        {view === "invites" && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              className="btn danger"
              type="button"
              onClick={revokeAllPending}
              disabled={saving || loading || !hasPending}
              title="Marca todos PENDING como REVOKED"
            >
              Revogar pendentes
            </button>

            <button
              className="btn danger"
              type="button"
              onClick={revokeAllInvites}
              disabled={saving || loading || !hasNotRevoked}
              title="Marca tudo que não for REVOKED como REVOKED (inclui ACCEPTED)"
            >
              Revogar todos
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ marginTop: 18 }}>
        {loading ? (
          <div style={{ fontWeight: 800, color: "var(--text)" }}>Carregando...</div>
        ) : view === "employees" ? (
          members.length === 0 ? (
            <div style={{ color: "var(--muted)", fontWeight: 800 }}>Nenhum funcionário ainda.</div>
          ) : (
            <div style={{ display: "grid", gap: 12, maxWidth: 900 }}>
              {members.map((m) => {
                const rClass = roleClass(m.role);
                const stKey = memberStatusKey(m.status);

                return (
                  <div
                    key={m.id}
                    style={{
                      border: "1px solid var(--line)",
                      borderRadius: 16,
                      padding: 14,
                      background: "#fff",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 900, fontSize: 16 }}>{m.email || "-"}</div>

                      <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                        {/* cargo com cor */}
                        <span className={`badge role ${rClass}`}>{rClass}</span>

                        {/* status */}
                        <span className="badge" style={{ background: "rgba(0,0,0,.04)" }}>
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 999,
                              background: stKey === "ACTIVE" ? "rgba(22,163,74,1)" : "rgba(239,68,68,1)",
                              display: "inline-block",
                            }}
                          />
                          {stKey === "ACTIVE" ? "ATIVO" : "INATIVO"}
                        </span>

                        <span className="badge" style={{ background: "rgba(0,0,0,.04)" }}>
                          Criado em:{" "}
                          {m.created_at ? new Date(m.created_at).toLocaleString("pt-BR") : "-"}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <button
                        className="btn danger"
                        type="button"
                        onClick={() => removeMember(m)}
                        disabled={saving}
                        title="Remove acesso do funcionário"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : invites.length === 0 ? (
          <div style={{ color: "var(--muted)", fontWeight: 800 }}>Nenhum convite ainda.</div>
        ) : (
          <div style={{ display: "grid", gap: 12, maxWidth: 900 }}>
            {invites.map((it) => {
              const st = String(it.status || "").toUpperCase();
              const canRevoke = st !== "REVOKED";
              const rClass = roleClass(it.role);

              return (
                <div
                  key={it.id}
                  style={{
                    border: "1px solid var(--line)",
                    borderRadius: 16,
                    padding: 14,
                    background: "#fff",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900, fontSize: 16 }}>{it.email}</div>

                    <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <span className={`badge role ${rClass}`}>{rClass}</span>
                      <InviteStatusBadge s={it.status} />
                      <span className="badge" style={{ background: "rgba(0,0,0,.04)" }}>
                        Criado em:{" "}
                        {it.created_at ? new Date(it.created_at).toLocaleString("pt-BR") : "-"}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {canRevoke ? (
                      <button
                        className="btn danger"
                        type="button"
                        onClick={() => revokeInvite(it.id, it.status)}
                        disabled={saving}
                        title="Marca como REVOKED"
                      >
                        Revogar
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}