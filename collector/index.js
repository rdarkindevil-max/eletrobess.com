import cron from "node-cron";
import { runCollector } from "./runCollector.js";

let running = false;

async function safeRun() {
  if (running) return;
  running = true;

  try {
    console.log("[collector] tick", new Date().toISOString());
    await runCollector();
    console.log("[collector] done", new Date().toISOString());
  } catch (e) {
    console.error("[collector] error", e?.message || e);
  } finally {
    running = false;
  }
}

await safeRun();                 // roda 1x ao iniciar
cron.schedule("*/2 * * * *", safeRun);  // a cada 2 min

console.log("[collector] started");