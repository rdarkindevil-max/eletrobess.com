import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useRole() {
  const [role, setRole] = useState("client");
  const [loadingRole, setLoadingRole] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoadingRole(true);

      // pega usuário logado
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;

      // sem user => trata como client
      if (!user) {
        if (alive) {
          setRole("client");
          setLoadingRole(false);
        }
        return;
      }

      // busca role na tabela profiles
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!alive) return;

      // se der erro (ex: profiles ainda não existe), assume client
      setRole(error ? "client" : (data?.role || "client"));
      setLoadingRole(false);
    })();

    return () => {
      alive = false;
    };
  }, []);

  return { role, loadingRole };
}
