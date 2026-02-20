// src/lib/logActivity.js
import { supabase } from "./supabaseClient";

/**
 * type: "LOGIN" | "LOGOUT" | etc
 * meta: { userId?, email?, ip?, userAgent?, extra?, dedupeKey? }
 *
 * IMPORTANTE:
 * - NÃO depende de getSession() (evita falhar no LOGOUT)
 * - usa UPSERT por dedupe_key pra não duplicar (multi-abas / dev)
 */
export async function logActivity(type, meta = {}) {
  const t = String(type || "").toUpperCase().trim();

  const payload = {
    type: t,
    user_id: meta.userId ?? null,
    email: meta.email ?? null,
    ip: meta.ip ?? null,
    user_agent: meta.userAgent ?? (typeof navigator !== "undefined" ? navigator.userAgent : null),
    extra: meta.extra ?? null,
    dedupe_key: meta.dedupeKey ?? null,
  };

  // ✅ upsert: se dedupe_key repetir, ignora (não duplica)
  const { error } = await supabase
    .from("activity_logs")
    .upsert(payload, { onConflict: "dedupe_key", ignoreDuplicates: true });

  if (error) throw error;
  return true;
}