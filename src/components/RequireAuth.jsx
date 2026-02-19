import React, { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function RequireAuth() {
  const [checking, setChecking] = useState(true);
  const [session, setSession] = useState(null);
  const location = useLocation();

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        setSession(null);
      } else {
        setSession(data?.session ?? null);
      }
      setChecking(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession ?? null);
      // se ainda tava checando, libera
      setChecking(false);
    });

    return () => {
      mounted = false;
      // ✅ forma correta
      data?.subscription?.unsubscribe?.();
    };
  }, []);

  if (checking) {
    return (
      <div style={{ minHeight: "60vh", display: "grid", placeItems: "center" }}>
        Carregando...
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
