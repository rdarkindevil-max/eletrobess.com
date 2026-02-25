import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Usinas() {
  const [integrations, setIntegrations] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [plants, setPlants] = useState([]);
  const [latestMap, setLatestMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);

    // Integrações ativas
    const { data: integrationsData, error: intError } = await supabase
      .from("integrations")
      .select("id,name,provider,is_active")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (intError) setMsg(intError.message);
    setIntegrations(integrationsData ?? []);
    const firstId = integrationsData?.[0]?.id ?? "";
    setSelectedId(firstId);

    // Plantas
    const { data: plantsData, error: plantsError } = await supabase
      .from("plants")
      .select("id,name,location,capacity_kwp")
      .order("created_at", { ascending: false });

    if (plantsError) setMsg(plantsError.message);
    setPlants(plantsData ?? []);

    // Snapshot latest
    const { data: latestData } = await supabase
      .from("plant_latest")
      .select("*");

    const map = {};
    latestData?.forEach((l) => {
      map[l.plant_id] = l;
    });

    setLatestMap(map);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  // 🔥 REALTIME
  useEffect(() => {
    const channel = supabase
      .channel("plants-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "plant_latest",
        },
        (payload) => {
          setLatestMap((prev) => ({
            ...prev,
            [payload.new.plant_id]: payload.new,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const selectedIntegration = useMemo(
    () => integrations.find((i) => i.id === selectedId),
    [integrations, selectedId]
  );

  function getStatusColor(status) {
    if (!status) return "#64748b";
    if (status === "ONLINE") return "#16a34a";
    if (status === "OFFLINE") return "#dc2626";
    return "#f59e0b";
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Usinas</h1>
      <p style={{ marginTop: 6, color: "#64748b" }}>
        Monitoramento em tempo real das usinas conectadas.
      </p>

      {loading ? (
        <div className="panel" style={{ marginTop: 12, padding: 16 }}>
          Carregando...
        </div>
      ) : (
        <>
          <div className="panel" style={{ marginTop: 12, padding: 16 }}>
            <label className="label">Integração ativa</label>
            <select
              className="input"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {integrations.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.provider})
                </option>
              ))}
            </select>

            {selectedIntegration && (
              <div style={{ marginTop: 10, color: "#64748b" }}>
                Provider: <b>{selectedIntegration.provider}</b>
              </div>
            )}
          </div>

          <div style={{ marginTop: 16 }}>
            {plants.length === 0 ? (
              <div className="panel" style={{ padding: 16 }}>
                Nenhuma usina cadastrada.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                  gap: 16,
                }}
              >
                {plants.map((plant) => {
                  const latest = latestMap[plant.id];
                  const status = latest?.status ?? "UNKNOWN";
                  const power = latest?.raw?.power_w ?? 0;

                  return (
                    <div
                      key={plant.id}
                      className="panel"
                      style={{
                        padding: 16,
                        borderLeft: `5px solid ${getStatusColor(status)}`,
                      }}
                    >
                      <h3 style={{ margin: 0 }}>{plant.name}</h3>
                      <div style={{ fontSize: 13, color: "#64748b" }}>
                        {plant.location}
                      </div>

                      <div style={{ marginTop: 12 }}>
                        <div>
                          Status:{" "}
                          <b style={{ color: getStatusColor(status) }}>
                            {status}
                          </b>
                        </div>

                        <div style={{ marginTop: 6 }}>
                          Potência Atual:{" "}
                          <b>
                            {(power / 1000).toFixed(2)} kW
                          </b>
                        </div>

                        <div style={{ marginTop: 6 }}>
                          Capacidade:{" "}
                          <b>{plant.capacity_kwp} kWp</b>
                        </div>

                        <div style={{ marginTop: 6, fontSize: 12, color: "#94a3b8" }}>
                          Última atualização:{" "}
                          {latest?.ts
                            ? new Date(latest.ts).toLocaleString()
                            : "—"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {msg && (
        <div className="warn" style={{ marginTop: 12 }}>
          Erro: {msg}
        </div>
      )}
    </div>
  );
}