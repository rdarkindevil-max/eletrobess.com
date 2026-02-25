import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) throw new Error("SUPABASE_URL is required (check collector/.env)");
if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required (check collector/.env)");

export const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});