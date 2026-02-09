// src/pages/Plants.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import "../styles.css";

function pillForStatus(st) {
  if (st === "ok") return "pill-ok";
  if (st === "warning") return "pill-warn";
  if (st === "offline") return "pill-err";
  return "pill-off";
}

export default function Plants() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [plants, setPlants] = useState([]);
  const [integrations, setIntegrations] = useState([]);

  const [q, setQ] = useState("");
  const [provider, setProvider] = useState("all");

  async function getUserId() {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id || null;
  }

  async function load() {
    setErr("");
    setLoading(true);
    const userId = await getUserId();
    if (!userId) {
      setErr("Usuário não autenticado.");
      setLoading(false);
      return;
    }

    const { data: intData, error: intErr } = await supabase
      .from("integrations")
      .select("id, provider, display_name, status")
      .eq("user_id", userId)
      .order("display_name", { ascending: true });

    if (intErr) {
      setErr(intErr.message);
      setIntegrations([]);
    } else {
      setIntegrations(intData || []);
    }

    const { data, error } = await supabase
      .from("plants")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      setErr(error.message);
      setPlants([]);
    } else {
      setPlants(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const providerOptions = useMemo(() => {
    const set = new Map();
    integrations.forEach((i) => set.set(i.provider, i.display_name));
    return Array.from(set.entries()).map(([key, name]) => ({ key, name }));
  }, [integrations]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();

    return (plants || []).filter((p) => {
      const matchQ =
        !qq ||
        [p.name, p.city, p.state, p.external_id]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(qq));

      const integ = integrations.find((i) => i.id === p.integration_id);
      const matchProvider = provider === "all" || integ?.provider === provider;

      return matchQ && matchProvider;
    });
  }, [plants, q, provider, integrations]);

  return (
    <div className="page">
      <div className="pageHeaderRow">
        <div>
          <h1 className="pageTitle">Usinas</h1>
          <p className="pageSub">Lista de usinas conectadas via APIs cadastradas.</p>
        </div>

        <button className="btn ghost" type="button" onClick={load}>
          Recarregar
        </button>
      </div>

      {err ? <div className="warn" style={{ marginTop: 12 }}>Erro: {err}</div> : null}

      <div className="card" style={{ marginTop: 16 }}>
        <div className="filtersRow">
          <div className="searchBox">
            <span className="searchIcon">🔎</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar usinas..."
            />
          </div>

          <div className="selectWrap">
            <label className="muted small">Provedor</label>
            <select className="input" value={provider} onChange={(e) => setProvider(e.target.value)}>
              <option value="all">Todos</option>
              {providerOptions.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="tableCard" style={{ marginTop: 16 }}>
        <div className="tableHeader">
          <div className="tableTitle">Lista</div>
          <div className="muted small">
            {loading ? "Carregando..." : `${filtered.length} resultado(s)`}
          </div>
        </div>

        {loading ? (
          <div className="muted" style={{ padding: 16 }}>Carregando usinas...</div>
        ) : filtered.length === 0 ? (
          <div className="muted" style={{ padding: 16 }}>
            Nenhuma usina encontrada.
            <div style={{ marginTop: 8 }}>
              Vá em <b>Integrações</b> → conecte um provedor → clique <b>Sincronizar</b>.
            </div>
          </div>
        ) : (
          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Localização</th>
                  <th>Potência</th>
                  <th>PR Mensal</th>
                  <th>PR Anual</th>
                  <th>Status</th>
                  <th>Provedor</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((p) => {
                  const integ = integrations.find((i) => i.id === p.integration_id);
                  const prM = Number(p.metrics?.pr_month ?? 0);
                  const prY = Number(p.metrics?.pr_year ?? 0);

                  return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        <div className="muted small">{p.external_id || ""}</div>
                      </td>

                      <td>
                        {p.city || "-"}
                        {p.state ? `/${p.state}` : ""}
                      </td>

                      <td>{p.capacity_kwp ? `${p.capacity_kwp} kWp` : "-"}</td>

                      <td>{prM ? `${(prM * 100).toFixed(1)}%` : "-"}</td>
                      <td>{prY ? `${(prY * 100).toFixed(1)}%` : "-"}</td>

                      <td>
                        <span className={`pill ${pillForStatus(p.status)}`}>
                          {p.status || "unknown"}
                        </span>
                      </td>

                      <td>{integ?.display_name || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="tableFooter muted small">
          Dica: o “Sincronizar” por enquanto cria usinas dummy (MVP). Depois a gente pluga API real.
        </div>
      </div>
    </div>
  );
}
