import React, { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./lib/supabaseClient";

import RequireAuth from "./components/RequireAuth";
import RequireRole from "./components/RequireRole";
import DashboardLayout from "./layout/DashboardLayout";

import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Employees from "./pages/Employees";
import EmployeeInvites from "./pages/EmployeeInvites";
import EmployeeLogs from "./pages/EmployeeLogs";
import CampoTecnico from "./pages/CampoTecnico";
import ClientPortal from "./pages/ClientPortal";
import Integrations from "./pages/Integrations";
import Plants from "./pages/Plants";

import { logActivity } from "./lib/logActivity";

export default function App() {
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        logActivity("LOGIN").catch((e) =>
          console.warn("Falha ao registrar LOGIN:", e?.message || e)
        );
      }

      // ❌ não loga SIGNED_OUT aqui (sem token, RLS bloqueia)
      // logout deve ser logado ANTES do signOut() no botão "Sair"
    });

    return () => {
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route element={<RequireAuth />}>
        <Route element={<DashboardLayout />}>
          <Route path="/app/client-portal" element={<ClientPortal />} />

          <Route
            path="/app/dashboard"
            element={
              <RequireRole allow={["staff", "admin"]}>
                <Dashboard />
              </RequireRole>
            }
          />

          <Route
            path="/app/clients"
            element={
              <RequireRole allow={["staff", "admin"]}>
                <Clients />
              </RequireRole>
            }
          />

          <Route
            path="/app/campo-tecnico"
            element={
              <RequireRole allow={["staff", "admin"]}>
                <CampoTecnico />
              </RequireRole>
            }
          />

          <Route
            path="/app/plants"
            element={
              <RequireRole allow={["staff", "admin"]}>
                <Plants />
              </RequireRole>
            }
          />

          <Route
            path="/app/employee-invites"
            element={
              <RequireRole allow={["staff", "admin"]}>
                <EmployeeInvites />
              </RequireRole>
            }
          />

          <Route
            path="/app/logs"
            element={
              <RequireRole allow={["staff", "admin"]}>
                <EmployeeLogs />
              </RequireRole>
            }
          />

          <Route
            path="/app/employees"
            element={
              <RequireRole allow={["admin"]}>
                <Employees />
              </RequireRole>
            }
          />

          <Route
            path="/app/integrations"
            element={
              <RequireRole allow={["admin"]}>
                <Integrations />
              </RequireRole>
            }
          />
        </Route>
      </Route>

      <Route path="/app/*" element={<Navigate to="/app/client-portal" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}