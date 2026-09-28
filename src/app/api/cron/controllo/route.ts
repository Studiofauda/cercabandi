import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runAnac } from "@/lib/ingestion/run";

/**
 * Controllo automatico delle fonti, chiamato ogni mattina da Vercel (vedi vercel.json).
 * Esegue la ricerca ANAC di ogni profilo che ne ha una salvata e attiva.
 *
 * Protezione: Vercel invia «Authorization: Bearer <CRON_SECRET>»; senza la parola d'ordine
 * giusta la richiesta viene rifiutata. La risposta contiene solo conteggi.
 */
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Margine di sicurezza: oltre questo tempo i profili restanti si rimandano al giorno dopo. */
const TIME_BUDGET_MS = 45_000;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "manca la variabile CRON_SECRET sul server" }, { status: 500 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "non autorizzato" }, { status: 401 });
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "configurazione" }, { status: 500 });
  }

  const { data: searches, error } = await supabase
    .from("connector_settings")
    .select("workspace_id, profile_id")
    .eq("connector", "anac")
    .eq("enabled", true);
  if (error) {
    // Il messaggio di Supabase non contiene la chiave: serve a capire se è sbagliata
    // (es. «Invalid API key») o se mancano i permessi sulle tabelle («permission denied»).
    const key = process.env.SUPABASE_SECRET_KEY ?? "";
    const kind = key.startsWith("sb_secret_") ? "chiave segreta" : key.startsWith("sb_publishable_") ? "chiave PUBBLICABILE (serve quella segreta)" : "chiave di formato non riconosciuto";
    console.error("Controllo automatico: lettura delle ricerche non riuscita", error.code, error.message);
    return NextResponse.json(
      { error: "lettura delle ricerche non riuscita", dettaglio: error.message, codice: error.code, chiave: kind },
      { status: 500 }
    );
  }

  const started = Date.now();
  const results: Array<{ profile: string; inserted?: number; updated?: number; error?: string; rinviato?: boolean }> = [];
  for (const s of searches ?? []) {
    if (Date.now() - started > TIME_BUDGET_MS) {
      results.push({ profile: s.profile_id, rinviato: true });
      continue;
    }
    try {
      const r = await runAnac(supabase, s.workspace_id, s.profile_id);
      results.push({ profile: s.profile_id, inserted: r.inserted, updated: r.updated });
    } catch (e) {
      // Un profilo con un errore non ferma gli altri; l'errore resta nel registro dei controlli.
      results.push({ profile: s.profile_id, error: e instanceof Error ? e.message : "errore" });
    }
  }
  return NextResponse.json({ ricerche: results.length, risultati: results });
}
