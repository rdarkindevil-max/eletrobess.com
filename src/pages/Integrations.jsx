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

    const { data, error } = await supabase
      .from("integrations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) setMsg(error.message);
    setRows(data ?? []);
    setLoading(false);
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
          <b style={{ fontSize: 15 }}>
            Integrações cadastradas
          </b>

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
                  <th>Provider</th>
                  <th>Ativa</th>
                  <th>Criada</th>
                </tr>
              </thead>

              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      Nenhuma integração encontrada.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.name ?? "-"}</td>
                      <td>{r.provider ?? "-"}</td>
                      <td>{r.is_active ? "Sim" : "Não"}</td>
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