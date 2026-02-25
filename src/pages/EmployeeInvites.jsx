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
   * - Se não existir / der erro, faz fallback:
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

    // normaliza formato pra parecer membro
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
  // - Se a fonte for fallback (invites accepted): marca invite como REVOKED
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

  // ✅ cores (pra não ficar apagado)
  const colors = {
    title: "#0f172a",
    text: "#0f172a",
    sub: "#475569",
    border: "rgba(15, 23, 42, .10)",
    bgCard: "#ffffff",
  };

  // ✅ botões inline (pra NÃO SUMIR por causa do teu CSS)
  const btnDanger = (disabled) => ({
    padding: "8px 14px",
    borderRadius: 12,
    border: "1px solid #ef4444",
    background: "#ffffff",
    color: "#ef4444",
    fontWeight: 900,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    whiteSpace: "nowrap",
  });

  const btnSoft = (disabled) => ({
    padding: "8px 14px",
    borderRadius: 12,
    border: "1px solid rgba(15,23,42,.14)",
    background: "#ffffff",
    color: colors.text,
    fontWeight: 900,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    whiteSpace: "nowrap",
  });

  const Badge = ({ children, tone = "default" }) => {
    const map = {
      default: { bg: "rgba(2, 132, 199, .10)", fg: "#075985", bd: "rgba(2,132,199,.25)" },
      ok: { bg: "rgba(16, 185, 129, .12)", fg: "#047857", bd: "rgba(16,185,129,.25)" },
      warn: { bg: "rgba(245, 158, 11, .12)", fg: "#92400e", bd: "rgba(245,158,11,.25)" },
      bad: { bg: "rgba(239, 68, 68, .12)", fg: "#991b1b", bd: "rgba(239,68,68,.25)" },
      gray: { bg: "rgba(100,116,139,.12)", fg: "#334155", bd: "rgba(100,116,139,.25)" },
    };
    const t = map[tone] || map.default;
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "4px 10px",
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 800,
          background: t.bg,
          color: t.fg,
          border: `1px solid ${t.bd}`,
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </span>
    );
  };

  const InviteStatusBadge = ({ s }) => {
    const st = String(s || "").toUpperCase();
    if (st === "PENDING") return <Badge tone="warn">PENDING</Badge>;
    if (st === "ACCEPTED") return <Badge tone="ok">ACCEPTED</Badge>;
    if (st === "REVOKED") return <Badge tone="bad">REVOKED</Badge>;
    return <Badge tone="gray">{st || "—"}</Badge>;
  };

  const hasPending = invites.some((i) => String(i.status).toUpperCase() === "PENDING");
  const hasNotRevoked = invites.some((i) => String(i.status).toUpperCase() !== "REVOKED");

  return (
    <div
      className="p-6 employee-page"
      style={{
        opacity: 1,
        filter: "none",
        color: colors.text,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", opacity: 1, filter: "none" }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0, color: colors.title }}>
          Convites de Funcionários
        </h1>
        <span style={{ color: colors.sub, fontWeight: 600 }}>
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
          opacity: 1,
          filter: "none",
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

      <div style={{ marginTop: 10, color: colors.sub, fontSize: 13, fontWeight: 600, opacity: 1, filter: "none" }}>
        * Isso só registra o convite. (Se quiser, dá pra integrar e-mail automático depois.)
      </div>

      {/* Tabs */}
      <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap", opacity: 1, filter: "none" }}>
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
          <span style={{ alignSelf: "center", color: colors.sub, fontSize: 12, fontWeight: 700 }}>
            Fonte: {membersSource === "employees" ? "employees" : "employee_invites (ACCEPTED)"}
          </span>
        )}

        {/* ✅ AÇÕES EM MASSA (só na aba convites) */}
        {view === "invites" && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={revokeAllPending}
              disabled={saving || loading || !hasPending}
              style={btnDanger(saving || loading || !hasPending)}
              title="Marca todos PENDING como REVOKED"
            >
              Revogar pendentes
            </button>

            <button
              type="button"
              onClick={revokeAllInvites}
              disabled={saving || loading || !hasNotRevoked}
              style={btnDanger(saving || loading || !hasNotRevoked)}
              title="Marca tudo que não for REVOKED como REVOKED (inclui ACCEPTED)"
            >
              Revogar todos
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ marginTop: 18, opacity: 1, filter: "none" }}>
        {loading ? (
          <div style={{ color: colors.text, fontWeight: 700 }}>Carregando...</div>
        ) : view === "employees" ? (
          members.length === 0 ? (
            <div style={{ color: colors.sub, fontWeight: 700 }}>Nenhum funcionário ainda.</div>
          ) : (
            <div style={{ display: "grid", gap: 10, maxWidth: 900 }}>
              {members.map((m) => (
                <div
                  key={m.id}
                  style={{
                    border: `1px solid ${colors.border}`,
                    borderRadius: 12,
                    padding: 12,
                    background: colors.bgCard,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                    opacity: 1,
                    filter: "none",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900, color: colors.text }}>
                      {m.email || "-"}
                    </div>
                    <div style={{ fontSize: 12, color: colors.sub, fontWeight: 700 }}>
                      role: <b style={{ color: colors.text }}>{m.role || "—"}</b>{" "}
                      • status: <b style={{ color: colors.text }}>{m.status || "ACTIVE"}</b>{" "}
                      • criado em:{" "}
                      <b style={{ color: colors.text }}>
                        {m.created_at ? new Date(m.created_at).toLocaleString("pt-BR") : "-"}
                      </b>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <Badge tone="ok">ATIVO</Badge>

                    {/* ✅ REMOVER FUNCIONÁRIO */}
                    <button
                      type="button"
                      onClick={() => removeMember(m)}
                      disabled={saving}
                      style={btnDanger(saving)}
                      title="Remove acesso do funcionário"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : invites.length === 0 ? (
          <div style={{ color: colors.sub, fontWeight: 700 }}>Nenhum convite ainda.</div>
        ) : (
          <div style={{ display: "grid", gap: 10, maxWidth: 900 }}>
            {invites.map((it) => {
              const st = String(it.status || "").toUpperCase();
              const canRevoke = st !== "REVOKED";
              return (
                <div
                  key={it.id}
                  style={{
                    border: `1px solid ${colors.border}`,
                    borderRadius: 12,
                    padding: 12,
                    background: colors.bgCard,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                    opacity: 1,
                    filter: "none",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900, color: colors.text }}>{it.email}</div>
                    <div style={{ fontSize: 12, color: colors.sub, fontWeight: 700 }}>
                      role: <b style={{ color: colors.text }}>{it.role}</b> • status:{" "}
                      <InviteStatusBadge s={it.status} /> • criado em:{" "}
                      <b style={{ color: colors.text }}>
                        {it.created_at ? new Date(it.created_at).toLocaleString("pt-BR") : "-"}
                      </b>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {canRevoke ? (
                      <button
                        type="button"
                        onClick={() => revokeInvite(it.id, it.status)}
                        disabled={saving}
                        style={btnSoft(saving)}
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