// src/lib/logActivity.js
import { supabase } from "./supabaseClient";

/**
 * type: "LOGIN" | "LOGOUT" | etc
 * meta: { userId?, email?, ip?, userAgent?, extra? }
 */
export async function logActivity(type, meta = {}) {
  const t = String(type || "").toUpperCase();

  // tenta pegar sessão (quando ainda existe)
  const { data: sess } = await supabase.auth.getSession();
  const user = sess?.session?.user || null;

  const payload = {
    type: t,
    user_id: meta.userId ?? user?.id ?? null,
    email: meta.email ?? user?.email ?? null,
    ip: meta.ip ?? null,
    user_agent: meta.userAgent ?? (typeof navigator !== "undefined" ? navigator.userAgent : null),
    extra: meta.extra ?? null,
  };

  const { error } = await supabase.from("activity_logs").insert(payload);
  if (error) throw error;

  return true;
}