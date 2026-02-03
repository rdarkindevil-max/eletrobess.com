import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login.jsx";
import Gate from "./pages/Gate.jsx";
import NoAccess from "./pages/NoAccess.jsx";

import ProtectedRoute from "./auth/ProtectedRoute.jsx";

import Clients from "./pages/Clients.jsx";
import Plants from "./pages/Plants.jsx";
import Integrations from "./pages/Integrations.jsx";
import ClientPortal from "./pages/ClientPortal.jsx";
import Campo from "./pages/Campo.jsx";
import Layout from "./Layout.jsx";

function Page({ name, children }) {
  return <Layout currentPageName={name}>{children}</Layout>;
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/gate" element={<Gate />} />
        <Route path="/no-access" element={<NoAccess />} />

        {/* STAFF/ADMIN */}
        <Route
          path="/clients"
          element={
            <ProtectedRoute allow={["staff", "admin"]}>
              <Page name="Clients">
                <Clients />
              </Page>
            </ProtectedRoute>
          }
        />

        <Route
          path="/plants"
          element={
            <ProtectedRoute allow={["staff", "admin"]}>
              <Page name="Plants">
                <Plants />
              </Page>
            </ProtectedRoute>
          }
        />

        <Route
          path="/integrations"
          element={
            <ProtectedRoute allow={["staff", "admin"]}>
              <Page name="Integrations">
                <Integrations />
              </Page>
            </ProtectedRoute>
          }
        />

        {/* CLIENT */}
        <Route
          path="/portal"
          element={
            <ProtectedRoute allow={["client"]}>
              <Page name="Portal">
                <ClientPortal />
              </Page>
            </ProtectedRoute>
          }
        />

        {/* TECH */}
        <Route
          path="/campo"
          element={
            <ProtectedRoute allow={["technician"]}>
              <Page name="Campo">
                <Campo />
              </Page>
            </ProtectedRoute>
          }
        />

        {/* default */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}
