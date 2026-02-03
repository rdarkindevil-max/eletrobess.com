import { useAuthContext } from "./AuthContext.jsx";

export function useAuth() {
  return useAuthContext();
}
