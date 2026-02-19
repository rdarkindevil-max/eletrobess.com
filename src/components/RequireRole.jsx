import React from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function RequireRole({ allow = [], children }) {
  const [loading, setLoading] = React.useState(true);
  const [role, setRole] = React.useState("client");

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data: sess } = await supabase.auth.getSession();
        const user = sess?.session?.user;

        if (!user) {
          if (mounted) {
            setRole("client");
            setLoading(false);
          }
          return;
        }

        const { data: prof, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (!mounted) return;

        const r = (!error && prof?.role ? prof.role : "client");
        setRole(String(r).toLowerCase());
        setLoading(false);
      } catch {
        if (mounted) {
          setRole("client");
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return null;

  if (!allow.includes(role)) {
    return <Navigate to="/app/client-portal" replace />;
  }

  return children;
}
