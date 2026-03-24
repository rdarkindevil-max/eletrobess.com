import { supabaseAdmin, supabaseUserFromReq } from "./_lib/supabase.js";

export default async function handler(req, res) {
  try {
    const { supabase } = supabaseUserFromReq(req);
    if (!supabase) return res.status(401).json({ error: "Sem token" });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    const user = userData?.user;
    if (userErr || !user) return res.status(401).json({ error: "Token inválido" });

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("integrations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json({ data });
    }

    if (req.method === "POST") {
      const body = req.body || {};
      const admin = supabaseAdmin();

      const payload = {
        user_id: user.id,
        display_name: body.display_name ?? body.name ?? "Integração",
        provider: body.provider ?? "generic",
        is_active: body.is_active ?? true,
        base_url: body.base_url ?? null,
        api_key: body.api_key ?? null,
      };

      const { data, error } = await admin
        .from("integrations")
        .insert([payload])
        .select("*")
        .single();

      if (error) return res.status(400).json({ error: error.message });
      return res.status(201).json({ data });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}