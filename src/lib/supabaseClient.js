// src/lib/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || "").trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

// ✅ trava cedo com erro claro (evita tela branca + 404 bizarro)
if (!supabaseUrl || !supabaseUrl.startsWith("https://")) {
  throw new Error(
    `VITE_SUPABASE_URL inválida: "${supabaseUrl}". ` +
      `Ela precisa existir e começar com "https://". ` +
      `Corrige isso nas Environment Variables do Vercel e faz redeploy.`
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    "VITE_SUPABASE_ANON_KEY está vazia. Corrige isso nas Environment Variables do Vercel e faz redeploy."
  );
}

// ✅ singleton (evita duplicar client com HMR/StrictMode)
const globalKey = "__eletrobess_supabase__";

function makeClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: "pkce",
      storage: localStorage,
    },
  });
}

export const supabase =
  globalThis[globalKey] ?? (globalThis[globalKey] = makeClient());