import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function Gate() {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      setAuthed(!!session);
      setLoading(false);
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setAuthed(!!session);
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // ⛔ NUNCA retorna null (isso causa tela branca)
  if (loading) {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui" }}>
        Verificando sessão…
      </div>
    );
  }

  if (!authed) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
