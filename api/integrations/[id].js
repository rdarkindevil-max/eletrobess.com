import { supabaseAdmin, supabaseUserFromReq } from "../_lib/supabase.js";

export default async function handler(req, res) {
  try {
    const { id } = req.query;

    const { supabase } = supabaseUserFromReq(req);
    if (!supabase) return res.status(401).json({ error: "Sem token" });

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return res.status(401).json({ error: "Token inválido" });

    const admin = supabaseAdmin();

    if (req.method === "PUT") {
      const body = req.body || {};
      const { data, error } = await admin
        .from("integrations")
        .update({
          name: body.name,
          type: body.type,
          base_url: body.base_url,
          api_key: body.api_key,
        })
        .eq("id", id)
        .eq("user_id", user.id)
        .select("*")
        .single();

      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json({ data });
    }

    if (req.method === "DELETE") {
      const { error } = await admin
        .from("integrations")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) return res.status(400).json({ error: error.message });
      return res.status(204).end();
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}