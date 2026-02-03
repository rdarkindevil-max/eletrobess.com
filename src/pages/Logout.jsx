import React from "react";
import { Navigate } from "react-router-dom";
import { logout } from "../auth/auth";

export default function Logout() {
  React.useEffect(() => logout(), []);
  return <Navigate to="/login" replace />;
}
