import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function Gate() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function run() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        const session = data?.session;

        if (!alive) return;

        if (!session) {
          navigate("/login", { replace: true });
          return;
        }

        // ✅ Se tiver logado, manda pro painel (ex: /clients)
        navigate("/clients", { replace: true });
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
  }, [navigate]);

  return <div style={{ padding: 24 }}>{loading ? "Carregando sessão..." : ""}</div>;
}
