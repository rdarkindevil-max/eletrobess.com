import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./useAuth.js";

export default function ProtectedRoute({ allow = [], children }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ padding: 24, fontFamily: "sans-serif" }}>
        Carregando…
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (allow?.length && !allow.includes(role)) {
    return <Navigate to="/no-access" replace />;
  }

  return children;
}
