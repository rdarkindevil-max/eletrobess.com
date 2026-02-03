import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function Gate() {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let alive = true;

    async function run() {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data?.session;

        if (!alive) return;

        // ✅ log pra você ver o que está acontecendo
        console.log("[GATE] session:", !!session);

        if (session) {
          // se logou, manda pro app
          navigate("/clients", { replace: true });
        } else {
          // se não tem sessão, manda pro login
          // (evita loop se já estiver no /login)
          if (location.pathname !== "/login") {
            navigate("/login", { replace: true });
          }
        }
      } catch (e) {
        console.error("[GATE] erro:", e);
        if (alive) navigate("/login", { replace: true });
      } finally {
        if (alive) setLoading(false);
      }
    }

    run();

    return () => {
      alive = false;
    };
  }, [navigate, location.pathname]);

  return (
    <div style={{ padding: 16, fontFamily: "system-ui" }}>
      {loading ? "Carregando sessão..." : "Redirecionando..."}
    </div>
  );
}
