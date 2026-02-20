import { supabase } from "./supabaseClient";

export async function logActivity(action) {
  const { data } = await supabase.auth.getUser();
  const user = data?.user;

  if (!user) return;

  try {
    await supabase.from("employee_logs").insert({
      user_id: user.id,
      email: user.email,
      action,
      user_agent: navigator.userAgent,
    });
  } catch (err) {
    console.error("Erro ao salvar log:", err.message);
  }
}