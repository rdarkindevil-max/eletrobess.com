import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { logActivity } from "../lib/logActivity";

export default function Logout() {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        // pega usuário ANTES do signOut
        const { data: ud } = await supabase.auth.getUser();
        const user = ud?.user;

        if (user) {
          await logActivity("LOGOUT", {
            userId: user.id,
            email: user.email,
          });
        }
      } catch (e) {
        console.warn("Falha ao registrar LOGOUT:", e);
      } finally {
        await supabase.auth.signOut();
        navigate("/login", { replace: true });
      }
    })();
  }, [navigate]);

  return (
    <div style={{ padding: 24, color: "#fff" }}>
      Saindo...
    </div>
  );
}