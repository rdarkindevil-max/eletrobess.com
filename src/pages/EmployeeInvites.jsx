import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function EmployeeInvites() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("staff");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [invites, setInvites] = useState([]);
  const [errMsg, setErrMsg] = useState("");

  const isValidEmail = useMemo(() => {
    const e = String(email || "").trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  }, [email]);

  const loadInvites = async () => {
    setErrMsg("");
    setLoading(true);

    const { data, error } = await supabase
      .from("employee_invites")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setErrMsg(error.message);
      setInvites([]);
    } else {
      setInvites(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadInvites();
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
    await loadInvites();
  };

  const revokeInvite = async (id) => {
    if (!confirm("Revogar convite?")) return;

    const { error } = await supabase
      .from("employee_invites")
      .update({ status: "REVOKED" })
      .eq("id", id);

    if (error) {
      setErrMsg(error.message);
      return;
    }
    await loadInvites();
  };

  return (
    <div className="p-6">
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Convites de Funcionários</h1>
        <span style={{ opacity: 0.7 }}>Adicionar emails e controlar acessos</span>
      </div>

      {errMsg ? (
        <div className="warn" style={{ marginTop: 12 }}>
          Erro: {errMsg}
        </div>
      ) : null}

      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 180px 140px", gap: 10, maxWidth: 820 }}>
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

        <button className="btn primary" type="button" onClick={createInvite} disabled={!isValidEmail || saving}>
          {saving ? "Salvando..." : "Adicionar"}
        </button>
      </div>

      <div style={{ marginTop: 18, opacity: 0.75, fontSize: 13 }}>
        * Isso só registra o convite. (Se você quiser, eu integro envio de e-mail automático.)
      </div>

      <div style={{ marginTop: 18 }}>
        {loading ? (
          <div>Carregando...</div>
        ) : invites.length === 0 ? (
          <div>Nenhum convite ainda.</div>
        ) : (
          <div style={{ display: "grid", gap: 10, maxWidth: 900 }}>
            {invites.map((it) => (
              <div
                key={it.id}
                style={{
                  border: "1px solid rgba(0,0,0,.08)",
                  borderRadius: 12,
                  padding: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800 }}>{it.email}</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    role: <b>{it.role}</b> • status: <b>{it.status}</b> • criado em:{" "}
                    {it.created_at ? new Date(it.created_at).toLocaleString("pt-BR") : "-"}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  {it.status === "PENDING" ? (
                    <button className="btn danger" type="button" onClick={() => revokeInvite(it.id)}>
                      Revogar
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
