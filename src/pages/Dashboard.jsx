import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import "../layout/dashboard.css";

function Card({ title, value, sub }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,.06)",
        border: "1px solid rgba(255,255,255,.10)",
        borderRadius: 18,
        padding: 16,
        color: "rgba(0, 0, 0, 0.92)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.75 }}>{title}</div>
      <div style={{ fontSize: 26, fontWeight: 800, marginTop: 8 }}>{value}</div>
      {sub ? <div style={{ fontSize: 12, opacity: 0.65, marginTop: 6 }}>{sub}</div> : null}
    </div>
  );
}

export default function Dashboard() {
  const [role, setRole] = useState("client");
  const [loadingRole, setLoadingRole] = useState(true);

  const [clientsCount, setClientsCount] = useState(0);
  const [employeesCount, setEmployeesCount] = useState(0);
  const [employeesActive, setEmployeesActive] = useState(0);
  const [employeesInactive, setEmployeesInactive] = useState(0);

  useEffect(() => {
    loadRole();
  }, []);

  const loadRole = async () => {
    setLoadingRole(true);

    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;

    if (!user) {
      setRole("client");
      setLoadingRole(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    setRole(error ? "client" : (data?.role || "client"));
    setLoadingRole(false);
  };

  useEffect(() => {
    // só staff/admin precisam de stats do painel
    if (!loadingRole && (role === "staff" || role === "admin")) {
      loadStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingRole, role]);

  const loadStats = async () => {
    const { count: clients } = await supabase.from("clients").select("*", { count: "exact", head: true });

    const { count: employees } = await supabase.from("employees").select("*", { count: "exact", head: true });

    const { count: active } = await supabase
      .from("employees")
      .select("*", { count: "exact", head: true })
      .eq("status", "ATIVO");

    const { count: inactive } = await supabase
      .from("employees")
      .select("*", { count: "exact", head: true })
      .eq("status", "INATIVO");

    setClientsCount(clients || 0);
    setEmployeesCount(employees || 0);
    setEmployeesActive(active || 0);
    setEmployeesInactive(inactive || 0);
  };

  const canSeeStaffArea = useMemo(() => role === "staff" || role === "admin", [role]);
  const isAdmin = useMemo(() => role === "admin", [role]);

  // loading role
  if (loadingRole) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
      </div>
    );
  }

  // se for client, manda pro portal (ou mostra uma tela simples)
  if (!canSeeStaffArea) {
    return (
      <div>
        <div style={{ color: "#031026" }}>
          <h1 style={{ margin: 0, fontSize: 34, fontWeight: 900 }}>Bem-vindo</h1>
          <p style={{ marginTop: 6, opacity: 0.75 }}>
            Seu acesso é de <b>Cliente</b>. Use o <b>Portal do Cliente</b> para acompanhar informações.
          </p>
        </div>

        <div
          style={{
            marginTop: 14,
            background: "rgba(255,255,255,.06)",
            border: "1px solid rgba(255,255,255,.10)",
            borderRadius: 18,
            padding: 16,
            color: "rgba(5, 19, 42, 0.92)",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Atalho</h2>
          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href="/app/client-portal" style={linkBtn}>
              Portal do Cliente
            </a>
          </div>
        </div>
      </div>
    );
  }

  // staff/admin dashboard completo
  return (
    <div>
      <div style={{ color: "#031026" }}>
        <h1 style={{ margin: 0, fontSize: 34, fontWeight: 900 }}>Dashboard</h1>
        <p style={{ marginTop: 6, opacity: 0.75 }}>Visão geral do painel.</p>
      </div>

      <div
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        <Card title="Clientes" value={clientsCount} sub="Cadastro / funil" />
        <Card title="Funcionários" value={employeesCount} sub="Total" />
        <Card title="Funcionários (Ativos)" value={employeesActive} sub="Equipe operando" />
        <Card title="Funcionários (Inativos)" value={employeesInactive} sub="Desligados / pausados" />
      </div>

      <div
        style={{
          marginTop: 14,
          background: "rgba(255,255,255,.06)",
          border: "1px solid rgba(255,255,255,.10)",
          borderRadius: 18,
          padding: 16,
          color: "rgba(5, 19, 42, 0.92)",
        }}
      >
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Atalhos</h2>

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a href="/app/clients" style={linkBtn}>
            Clientes
          </a>
          <a href="/app/campo-tecnico" style={linkBtn}>
            Campo (Técnico)
          </a>
          <a href="/app/plants" style={linkBtn}>
            Usinas
          </a>
          <a href="/app/employee-invites" style={linkBtn}>
            Convites (Funcionários)
          </a>

          {isAdmin ? (
            <a href="/app/employees" style={linkBtn}>
              Funcionários
            </a>
          ) : null}
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
  fontSize: 13,
};
