import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { logActivity } from "../lib/logActivity";

export default function Logout() {
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      try {
        // 🔥 pega sessão diretamente (mais seguro que getUser)
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;
        const user = session?.user;

        if (user) {
          await logActivity("LOGOUT", {
            userId: user.id,
            email: user.email,
          });
        }
      } catch (err) {
        console.warn("Erro ao registrar LOGOUT:", err);
      }

      // 🔥 só faz signOut depois do log
      await supabase.auth.signOut();
      navigate("/login", { replace: true });
    };

    run();
  }, [navigate]);

  return (
    <div style={{ padding: 24, color: "#fff" }}>
      Saindo...
    </div>
  );
}