import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");

    const { data: userData } = await supabase.auth.getUser(token);

    const userId = userData?.user?.id;

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const { data: integrations } = await supabase
      .from("integrations")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true);

    let created = 0;

    for (const integration of integrations || []) {

      const payload = {
        user_id: userId,
        integration_id: integration.id,
        provider: integration.provider,
        external_id: `plant-${integration.id}`,
        name: "Usina Demo",
        status: "ok",
      };

      const { error } = await supabase
        .from("plants")
        .upsert(payload, {
          onConflict: "user_id,external_id",
        });

      if (!error) created++;
    }

    return new Response(JSON.stringify({ ok: true, created }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });

  } catch (err) {

    return new Response(JSON.stringify({
      error: String(err),
    }), {
      status: 500,
      headers: corsHeaders,
    });

  }

});