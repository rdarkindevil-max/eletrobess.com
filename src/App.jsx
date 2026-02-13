import { Routes, Route, Navigate } from "react-router-dom";
import RequireAuth from "./components/RequireAuth";
import RequireRole from "./components/RequireRole"; // ✅ ADD
import DashboardLayout from "./layout/DashboardLayout";

import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Employees from "./pages/Employees";
import EmployeeInvites from "./pages/EmployeeInvites"; // ✅ ADD (crie esse arquivo)
import CampoTecnico from "./pages/CampoTecnico";
import ClientPortal from "./pages/ClientPortal";
import Integrations from "./pages/Integrations";
import Plants from "./pages/Plants";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route element={<RequireAuth />}>
        <Route element={<DashboardLayout />}>
          {/* ✅ CLIENT PORTAL: todo mundo autenticado pode */}
          <Route path="/app/client-portal" element={<ClientPortal />} />

          {/* ✅ STAFF/ADMIN */}
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

          {/* ✅ CONVITES: só staff/admin */}
          <Route
            path="/app/employee-invites"
            element={
              <RequireRole allow={["staff", "admin"]}>
                <EmployeeInvites />
              </RequireRole>
            }
          />

          {/* ✅ ADMIN ONLY */}
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

      {/* ✅ IMPORTANTE: qualquer /app/* cai no portal por padrão */}
      <Route path="/app/*" element={<Navigate to="/app/client-portal" replace />} />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
