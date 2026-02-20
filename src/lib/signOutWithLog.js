// src/lib/signOutWithLog.js
import { supabase } from "./supabaseClient";
import { logActivity } from "./logActivity";

export async function signOutWithLog() {
  // pega a sessão ANTES de deslogar
  const { data } = await supabase.auth.getSession();
  const user = data?.session?.user;

  // tenta registrar o logout enquanto ainda está autenticado
  if (user?.id) {
    try {
      await logActivity("LOGOUT", {
        userId: user.id,
        email: user.email,
        // dedupeKey opcional:
        // dedupeKey: `LOGOUT:${user.id}:${Date.now()}`
        extra: { source: "button_logout" },
      });
    } catch (e) {
      console.warn("Falha ao registrar LOGOUT:", e);
      // não trava o logout
    }
  }

  // agora sim desloga
  await supabase.auth.signOut();
}