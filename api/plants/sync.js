import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

function json(res, status, body) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(status).send(JSON.stringify(body));
}

export default async function handler(req, res) {
  // evita 405 por preflight (caso aconteça)
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  // Só POST
  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed", method: req.method });
  }

  try {
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return json(res, 500, {
        error:
          "Faltam variáveis de ambiente no Vercel: SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY",
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    // ✅ valida login do usuário (mesmo token que você manda do front)
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

    if (!token) return json(res, 401, { error: "Missing Bearer token" });

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return json(res, 401, { error: "Token inválido / expirado" });
    }

    const userId = userData.user.id;

    // ✅ pega integrações growatt ativas do usuário
    const { data: integrations, error: intErr } = await supabase
      .from("integrations")
      .select("id, provider, config, is_active")
      .eq("user_id", userId)
      .eq("provider", "growatt")
      .eq("is_active", true);

    if (intErr) return json(res, 400, { error: intErr.message });
    if (!integrations?.length) {
      return json(res, 200, { ok: true, created: 0, message: "Nenhuma integração Growatt ativa." });
    }

    let created = 0;

    for (const integration of integrations) {
      const config = integration.config || {};
      const username = config.username;
      const password = config.password;

      if (!username || !password) continue;

      // ⚠️ Growatt real: endpoints variam e podem exigir outros headers/cookies.
      // Aqui fica como base (você já tinha esse padrão).
      const login = await fetch("https://server.growatt.com/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account: username, password }),
      });

      const loginJson = await login.json().catch(() => ({}));
      const tokenGrowatt = loginJson?.data?.token;

      if (!tokenGrowatt) continue;

      const plantsRes = await fetch("https://server.growatt.com/panel/getPlants", {
        headers: { Authorization: `Bearer ${tokenGrowatt}` },
      });

      const plantsJson = await plantsRes.json().catch(() => ({}));
      const plants = plantsJson?.data || [];

      for (const p of plants) {
        // ✅ grava no seu banco
        const payload = {
          user_id: userId,
          integration_id: integration.id,
          provider: "growatt",
          external_id: String(p.plantId ?? ""),
          name: p.plantName ?? "Sem nome",
          status: p.status ?? "unknown",
        };

        const { error: upErr } = await supabase
          .from("plants")
          .upsert(payload, { onConflict: "user_id,external_id" });

        if (!upErr) created++;
      }
    }

    return json(res, 200, { ok: true, created });
  } catch (e) {
    return json(res, 500, { error: String(e?.message || e) });
  }
}