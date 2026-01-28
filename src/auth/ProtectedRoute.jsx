import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({ allow, children }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" />;

  if (allow && !allow.includes(user.role))
    return <Navigate to="/403" />;

  return children;
}
