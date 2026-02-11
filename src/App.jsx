import { Routes, Route, Navigate } from "react-router-dom";
import RequireAuth from "./components/RequireAuth";
import DashboardLayout from "./layout/DashboardLayout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import CampoTecnico from "./pages/CampoTecnico";
import ClientPortal from "./pages/ClientPortal";
import Integrations from "./pages/Integrations";
import Plants from "./pages/Plants";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route element={<RequireAuth />}>
        <Route element={<DashboardLayout />}>
          <Route path="/app/dashboard" element={<Dashboard />} />
          <Route path="/app/clients" element={<Clients />} />
          <Route path="/app/campo-tecnico" element={<CampoTecnico />} />
          <Route path="/app/client-portal" element={<ClientPortal />} />
          <Route path="/app/integrations" element={<Integrations />} />
          <Route path="/app/plants" element={<Plants />} />
        </Route>
      </Route>

      <Route path="/app/*" element={<Navigate to="/app/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
