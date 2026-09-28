import { createClient } from "@supabase/supabase-js";

/**
 * Client con la chiave segreta di Supabase: scavalca le regole di accesso (RLS).
 * Si usa SOLO sul server, per il controllo automatico delle fonti, quando nessun utente
 * è collegato. La chiave non ha il prefisso NEXT_PUBLIC_, quindi non arriva mai al browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("manca la variabile SUPABASE_SECRET_KEY sul server.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
