import { supabase } from "./supabaseClient";

export async function logActivity(type) {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;

    const payload = {
      type, // "LOGIN" | "LOGOUT"
      user_id: user?.id ?? null,
      email: user?.email ?? null,
      ip: null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    };

    const { error } = await supabase.from("activity_logs").insert(payload);
    if (error) console.error("logActivity error:", error.message);
  } catch (e) {
    console.error("logActivity exception:", e?.message || e);
  }
}