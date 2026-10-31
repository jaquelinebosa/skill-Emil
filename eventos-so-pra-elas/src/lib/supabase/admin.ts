import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Cliente com a chave secreta. Só pode ser usado no servidor.
let client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (typeof window !== "undefined") throw new Error("db() só roda no servidor");
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY");
    client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return client;
}
