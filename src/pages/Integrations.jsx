// src/pages/Integrations.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Integrations() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    setMsg("");

    try {
      // pega o token do usuário logado (Supabase)
      const {
        data: { session },
        error: sessErr,
      } = await supabase.auth.getSession();

      if (sessErr) throw sessErr;
      if (!session?.access_token) {
        throw new Error("Você não está logado (session inválida).");
      }

      // chama a API da Vercel (server-side), não o banco direto
      const r = await fetch("/api/integrations", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const json = await r.json().catch(() => ({}));

      if (!r.ok) {
        throw new Error(json?.error || `Erro HTTP ${r.status}`);
      }

      setRows(json?.data ?? []);
    } catch (e) {
      setRows([]);
      setMsg(e?.message || "Erro ao carregar integrações");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* HEADER DA PÁGINA */}
      <div style={{ marginBottom: 22 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 900,
            marginBottom: 6,
            color: "#0b1220",
          }}
        >
          Integrações
        </h1>

        <p
          style={{
            marginTop: 6,
            fontSize: 14,
            color: "var(--muted)",
          }}
        >
          Aqui você gerencia as integrações (APIs) para puxar dados das usinas.
        </p>
      </div>

      {msg && (
        <div className="warn" style={{ marginBottom: 14 }}>
          Erro: {msg}
        </div>
      )}

      <div
        className="panel"
        style={{
          padding: 18,
          color: "var(--text)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <b style={{ fontSize: 15 }}>Integrações cadastradas</b>

          <button className="btn" type="button" onClick={load}>
            Recarregar
          </button>
        </div>

        {loading ? (
          <div>Carregando...</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Tipo</th>
                  <th>URL</th>
                  <th>Criada</th>
                </tr>
              </thead>

              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4}>Nenhuma integração encontrada.</td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.name ?? "-"}</td>
                      <td>{r.type ?? "-"}</td>
                      <td>{r.base_url ?? "-"}</td>
                      <td>
                        {r.created_at
                          ? new Date(r.created_at).toLocaleString()
                          : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}