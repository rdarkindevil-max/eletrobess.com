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

// ===============================
// 🔐 DEDUPE LOGIN / LOGOUT
// ===============================

function makeDedupeKey(type, userId) {
  const sidKey = "activity_session_id";
  let sid = sessionStorage.getItem(sidKey);

  if (!sid) {
    sid = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    sessionStorage.setItem(sidKey, sid);
  }

  return `${String(type).toUpperCase()}:${userId || "anon"}:${sid}`;
}

function makeLogoutDedupeKey(userId) {
  const k = "activity_logout_seq";
  const n = (Number(sessionStorage.getItem(k) || "0") || 0) + 1;
  sessionStorage.setItem(k, String(n));
  return `LOGOUT:${userId || "anon"}:${Date.now()}:${n}`;
}

export default function App() {
  const subscribedRef = useRef(false);
  const lastUserRef = useRef({ userId: null, email: null });

  useEffect(() => {
    if (subscribedRef.current) return;
    subscribedRef.current = true;

    let isAlive = true;

    // LOGIN ao abrir app
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user;
        if (!isAlive || !user?.id) return;

        lastUserRef.current = { userId: user.id, email: user.email ?? null };

        await logActivity("LOGIN", {
          userId: user.id,
          email: user.email,
          dedupeKey: makeDedupeKey("LOGIN", user.id),
          extra: { source: "app_boot" },
        }).catch(() => {});
      } catch {}
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user;

      if (u?.id) {
        lastUserRef.current = { userId: u.id, email: u.email ?? null };
      }

      if (event === "SIGNED_IN") {
        if (!u?.id) return;

        logActivity("LOGIN", {
          userId: u.id,
          email: u.email,
          dedupeKey: makeDedupeKey("LOGIN", u.id),
          extra: { source: "auth_event" },
        }).catch(() => {});
      }

      if (event === "SIGNED_OUT") {
        const { userId, email } = lastUserRef.current || {};
        if (!userId) return;

        logActivity("LOGOUT", {
          userId,
          email,
          dedupeKey: makeLogoutDedupeKey(userId),
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
      {/* PUBLIC */}
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* PROTECTED */}
      <Route element={<RequireAuth />}>
        <Route element={<DashboardLayout />}>
          {/* CLIENT */}
          <Route path="/app/client-portal" element={<ClientPortal />} />

          {/* STAFF + ADMIN */}
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

          {/* EMPLOYEES (ajuste se quiser só admin) */}
          <Route
            path="/app/employees"
            element={
              <RequireRole allow={["staff", "admin"]}>
                <Employees />
              </RequireRole>
            }
          />

          {/* ✅ INTEGRAÇÕES: STAFF + ADMIN */}
          <Route
            path="/app/integrations"
            element={
              <RequireRole allow={["staff", "admin"]}>
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