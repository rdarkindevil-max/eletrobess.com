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
  if (!t) throw new Error("logActivity: type vazio");

  const payload = {
    type: t,
    user_id: meta.userId ?? null,
    email: meta.email ?? null,
    ip: meta.ip ?? null,
    user_agent:
      meta.userAgent ??
      (typeof navigator !== "undefined" ? navigator.userAgent : null),
    extra: meta.extra ?? null,
    dedupe_key: meta.dedupeKey ?? null,
  };

  const { error } = await supabase
    .from("activity_logs")
    .upsert(payload, { onConflict: "dedupe_key", ignoreDuplicates: true });

  if (error) {
    console.error("logActivity error:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      payload,
    });
    throw error;
  }
  return true;
}