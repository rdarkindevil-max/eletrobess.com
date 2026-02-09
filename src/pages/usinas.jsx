import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Usinas() {
  const [integrations, setIntegrations] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("integrations")
      .select("id,name,provider,is_active")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) setMsg(error.message);
    setIntegrations(data ?? []);
    setSelectedId(data?.[0]?.id ?? "");
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const selected = useMemo(
    () => integrations.find((i) => i.id === selectedId),
    [integrations, selectedId]
  );

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Usinas</h1>
      <p style={{ marginTop: 6, color: "#64748b" }}>
        Aqui vamos puxar as usinas da integração selecionada.
      </p>

      {loading ? (
        <div className="panel" style={{ marginTop: 12, padding: 16 }}>Carregando...</div>
      ) : (
        <div className="panel" style={{ marginTop: 12 }}>
          <div className="grid2">
            <div className="full">
              <label className="label">Integração ativa</label>
              <select className="input" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                {integrations.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.provider})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginTop: 12, color: "#64748b" }}>
            {selected ? (
              <>
                Selecionado: <b>{selected.name}</b> — provider <b>{selected.provider}</b>
                <div style={{ marginTop: 8 }}>
                  Próximo passo: criar uma <b>Edge Function</b> no Supabase pra buscar as usinas nesse provider usando
                  token/keys (porque isso não pode ficar no front).
                </div>
              </>
            ) : (
              "Nenhuma integração ativa encontrada."
            )}
          </div>
        </div>
      )}

      {msg ? (
        <div className="warn" style={{ marginTop: 12 }}>Erro: {msg}</div>
      ) : null}
    </div>
  );
}
