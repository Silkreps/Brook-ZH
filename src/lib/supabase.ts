import { createClient } from "@supabase/supabase-js";
import { env } from "./config";

export function getServiceSupabase() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("缺少 Supabase 服务端环境变量");
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}
