// src/App.jsx
import React, { useEffect, useRef } from "react";
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

function shouldLogLogin(userId) {
  if (!userId) return false;

  const key = `last_login_log_${userId}`;
  const last = Number(sessionStorage.getItem(key) || "0");
  const now = Date.now();

  // não loga de novo se já logou nos últimos 10s
  if (now - last < 10_000) return false;

  sessionStorage.setItem(key, String(now));
  return true;
}

export default function App() {
  const subscribedRef = useRef(false);

  useEffect(() => {
    // ✅ evita criar 2 listeners no dev com StrictMode
    if (subscribedRef.current) return;
    subscribedRef.current = true;

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") {
        const userId = session?.user?.id || null;
        const email = session?.user?.email || null;

        if (!shouldLogLogin(userId)) return;

        logActivity("LOGIN", { userId, email }).catch((e) => {
          console.warn("Falha ao registrar LOGIN:", e?.message || e);
        });
      }
    });

    return () => {
      listener?.subscription?.unsubscribe?.();
      subscribedRef.current = false;
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