// src/lib/logActivity.js
import { supabase } from "./supabaseClient";

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

  // ✅ sem dedupe_key = insert normal (não depende de UNIQUE)
  if (!payload.dedupe_key) {
    const { error } = await supabase.from("activity_logs").insert(payload);
    if (error) throw error;
    return true;
  }

  // ✅ com dedupe_key = upsert (precisa do UNIQUE index)
  const { error } = await supabase
    .from("activity_logs")
    .upsert(payload, { onConflict: "dedupe_key", ignoreDuplicates: true });

  if (error) throw error;
  return true;
}