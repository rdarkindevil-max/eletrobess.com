import { supabase } from "../lib/supabaseClient";

// pega usuário atual
export async function getUser() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user || null;
}

// pega role direto da tabela profiles
export async function getRole(userId) {
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  return data?.role || null;
}
