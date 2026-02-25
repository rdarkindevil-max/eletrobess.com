import { supabase } from "./lib/supabase.js";
import { fetchSungrowPlants } from "./providers/sungrow.js";

export async function runCollector() {
  console.log("Running collector...");

  const { data: integrations, error } = await supabase
    .from("integrations")
    .select("id,user_id,provider,is_active,config")
    .eq("is_active", true);

  if (error) throw error;
  if (!integrations?.length) {
    console.log("No active integrations.");
    return;
  }

  for (const integration of integrations) {
    let plantsData = [];

    if (integration.provider === "sungrow") {
      plantsData = await fetchSungrowPlants(integration);
    } else {
      continue;
    }

    for (const plant of plantsData) {
      // 1) garantir que a plant existe no seu banco
      const { data: upsertedPlant, error: upErr } = await supabase
        .from("plants")
        .upsert(
          {
            integration_id: integration.id,
            user_id: integration.user_id,
            name: plant.name ?? `Plant ${plant.id}`,
            external_plant_id: String(plant.id),
            location: plant.location ?? null,
            config: plant,
          },
          { onConflict: "integration_id,external_plant_id" }
        )
        .select("id")
        .single();

      if (upErr) {
        console.error("upsert plant error:", upErr.message);
        continue;
      }

      const plantId = upsertedPlant.id;

      const power = Number(plant.power_w ?? 0);
      const energyToday = Number(plant.energy_today_kwh ?? 0);

      // 2) snapshot (latest)
      const { error: latestErr } = await supabase.from("plant_latest").upsert({
        plant_id: plantId,
        status: plant.online ? "ONLINE" : "OFFLINE",
        raw: plant,
        ts: new Date().toISOString(),
      });

      if (latestErr) console.error("plant_latest error:", latestErr.message);

      // 3) histórico
      const { error: metricsErr } = await supabase.from("plant_metrics").insert([
        {
          plant_id: plantId,
          metric: "POWER_W",
          value: power,
          raw: plant,
        },
        {
          plant_id: plantId,
          metric: "ENERGY_TODAY_KWH",
          value: energyToday,
          raw: plant,
        },
      ]);

      if (metricsErr) console.error("plant_metrics error:", metricsErr.message);
    }
  }
}