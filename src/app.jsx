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

// ✅ dedupe por sessão do browser + evento
function makeDedupeKey(type, userId) {
  const sidKey = "activity_session_id";
  let sid = sessionStorage.getItem(sidKey);

  if (!sid) {
    sid = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    sessionStorage.setItem(sidKey, sid);
  }

  // exemplo: LOGIN:<userId>:<sid>
  return `${String(type).toUpperCase()}:${userId || "anon"}:${sid}`;
}

export default function App() {
  const subscribedRef = useRef(false);

  useEffect(() => {
    // ✅ evita duplicar listener no dev (StrictMode)
    if (subscribedRef.current) return;
    subscribedRef.current = true;

    let isAlive = true;

    // ✅ se já estiver logado quando abrir/atualizar, registra LOGIN 1x
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user;
        if (!isAlive || !user?.id) return;

        await logActivity("LOGIN", {
          userId: user.id,
          email: user.email,
          dedupeKey: makeDedupeKey("LOGIN", user.id),
          extra: { source: "app_boot" },
        }).catch(() => {});
      } catch {
        // ignora
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      // ✅ LOGA SÓ LOGIN (logout fica no botão do dashboard)
      if (event === "SIGNED_IN") {
        const userId = session?.user?.id || null;
        const email = session?.user?.email || null;
        if (!userId) return;

        logActivity("LOGIN", {
          userId,
          email,
          dedupeKey: makeDedupeKey("LOGIN", userId),
          extra: { source: "auth_event" },
        }).catch(() => {});
      }
    });

    return () => {
      isAlive = false;
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
logActivity("LOGIN", {
  userId,
  email,
  dedupeKey: `login:${userId || "anon"}:${Date.now()}`, // ✅ único
}).catch((e) => console.warn("Falha ao registrar LOGIN:", e));