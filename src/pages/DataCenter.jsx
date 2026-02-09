import React from "react";

export default function DataCenter() {
  return (
    <div style={{ color: "#eaf2ff" }}>
      <h1 style={{ margin: 0, fontSize: 34, fontWeight: 900 }}>Central de Dados Inteligente</h1>
      <p style={{ marginTop: 6, opacity: .75 }}>
        Importação confiável, automática e transparente.
      </p>

      <div style={{
        marginTop: 16,
        background: "rgba(255,255,255,.06)",
        border: "1px solid rgba(255,255,255,.10)",
        borderRadius: 18,
        padding: 16
      }}>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={tabBtn}>Importar Dados</button>
          <button style={tabBtnMuted}>Histórico</button>
        </div>

        <div style={{
          marginTop: 14,
          background: "rgba(0,0,0,.25)",
          border: "1px solid rgba(255,255,255,.08)",
          borderRadius: 18,
          padding: 18
        }}>
          <div style={{ fontWeight: 800 }}>Importação Concluída</div>

          <div style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 12
          }}>
            <MiniCard title="Salvos com sucesso" value="0" />
            <MiniCard title="Falharam" value="0" />
            <MiniCard title="Entidade" value="PlantSale" />
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            <button style={ghostBtn}>Importar Novo</button>
            <button style={primaryBtn}>Ver Dados Importados</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniCard({ title, value }) {
  return (
    <div style={{
      background: "rgba(255,255,255,.06)",
      border: "1px solid rgba(255,255,255,.10)",
      borderRadius: 18,
      padding: 16
    }}>
      <div style={{ opacity: .75, fontSize: 12 }}>{title}</div>
      <div style={{ marginTop: 8, fontSize: 26, fontWeight: 900 }}>{value}</div>
    </div>
  );
}

const tabBtn = {
  padding: "10px 14px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,.12)",
  background: "rgba(255,255,255,.10)",
  color: "#eaf2ff",
  fontWeight: 800,
  cursor: "pointer"
};
const tabBtnMuted = { ...tabBtn, background: "rgba(255,255,255,.06)", opacity: .8 };
const ghostBtn = {
  padding: "10px 14px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,.12)",
  background: "rgba(255,255,255,.06)",
  color: "#eaf2ff",
  fontWeight: 800,
  cursor: "pointer"
};
const primaryBtn = {
  padding: "10px 14px",
  borderRadius: 14,
  border: "1px solid rgba(42,211,162,.28)",
  background: "rgba(42,211,162,.18)",
  color: "#eaf2ff",
  fontWeight: 900,
  cursor: "pointer",
  flex: 1
};
