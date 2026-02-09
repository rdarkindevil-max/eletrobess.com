import React from "react";
import "../layout/dashboard.css";

function Card({ title, value, sub }) {
  return (
    <div style={{
      background: "rgba(255,255,255,.06)",
      border: "1px solid rgba(255,255,255,.10)",
      borderRadius: 18,
      padding: 16,
      color: "rgba(0, 0, 0, 0.92)",
      backdropFilter: "blur(10px)"
    }}>
      <div style={{ fontSize: 12, opacity: .75 }}>{title}</div>
      <div style={{ fontSize: 26, fontWeight: 800, marginTop: 8 }}>{value}</div>
      {sub ? <div style={{ fontSize: 12, opacity: .65, marginTop: 6 }}>{sub}</div> : null}
    </div>
  );
}

export default function Dashboard() {
  return (
    <div>
      <div style={{ color: "#031026" }}>
        <h1 style={{ margin: 0, fontSize: 34, fontWeight: 900 }}>Dashboard</h1>
        <p style={{ marginTop: 6, opacity: .75 }}>
          Visão geral do painel (igual ao modelo).
        </p>
      </div>

      <div style={{
        marginTop: 18,
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gap: 12
      }}>
        <Card title="Importações (hoje)" value="0" sub="Central de Dados" />
        <Card title="Clientes" value="0" sub="Cadastro / funil" />
        <Card title="Projetos / Usinas" value="0" sub="Andamento" />
        <Card title="Vendas" value="0" sub="Mês atual" />
      </div>

      <div style={{
        marginTop: 14,
        background: "rgba(255,255,255,.06)",
        border: "1px solid rgba(255,255,255,.10)",
        borderRadius: 18,
        padding: 16,
        color: "rgba(5, 19, 42, 0.92)"
      }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Atalhos</h2>
        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a href="/app/datacenter" style={linkBtn}>Central de Dados</a>
          <a href="/app/clients" style={linkBtn}>Clientes</a>
          <a href="/app/campo-tecnico" style={linkBtn}>Campo (Técnico)</a>
        </div>
      </div>
    </div>
  );
}

const linkBtn = {
  textDecoration: "none",
  color: "rgba(4, 17, 38, 0.95)",
  background: "rgba(42,211,162,.12)",
  border: "1px solid rgba(42,211,162,.28)",
  padding: "10px 12px",
  borderRadius: 14,
  fontWeight: 700,
  fontSize: 13
};
