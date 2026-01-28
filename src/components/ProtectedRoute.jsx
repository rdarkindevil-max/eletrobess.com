import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ user, allow = [], children }) {
  if (!user) return <Navigate to="/login" replace />;

  // allow vazio = qualquer usuário logado
  if (allow.length > 0 && !allow.includes(user.role)) {
    return <Navigate to="/403" replace />;
  }

  return children;
}
