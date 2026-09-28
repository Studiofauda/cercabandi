/**
 * Un controllo di una fonte: legge gli avvisi, applica i filtri e scrive nel database i
 * bandi nuovi o modificati. Lo storico non si sovrascrive: ogni modifica a un bando già
 * noto genera una revisione.
 *
 * Il client Supabase è quello dell'utente che ha premuto «Controlla ora»: le scritture
 * passano dalle regole di accesso (servono i permessi di modifica).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAnac, rejectReason, DEFAULT_ANAC_FILTERS, type AnacCandidate, type AnacFilters } from "./anac";
import { date, euro } from "@/lib/format";

export interface RunSummary {
  runId: string;
  found: number;
  inserted: number;
  updated: number;
  skipped: number;
  rejected: Record<string, number>;
}

const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);

function toRow(c: AnacCandidate, workspaceId: string, sourceId: string | null, today: string) {
  const notes = [
    `Trovato su ANAC (pubblicità legale) il ${date(new Date().toISOString())}, pubblicato il ${date(c.publishedAt)}.`,
    `Tipo di avviso: ${c.tipologia}.`,
    c.cigs.length ? `CIG: ${c.cigs.join(", ")}.` : null,
    c.cpv ? `CPV: ${c.cpv}.` : null,
    c.amount !== null ? `Importo stimato: ${euro(c.amount)}.` : null,
    c.luogo.incerto ? "Luogo da verificare: l'avviso non permette di stabilire con certezza la regione." : null,
    c.competenze.length ? "Competenze richieste dedotte dal testo: da verificare sul disciplinare." : null,
    "",
    c.description,
  ]
    .filter((l) => l !== null)
    .join("\n");

  return {
    workspace_id: workspaceId,
    external_code: c.externalCode,
    origin: "anac",
    title: c.title,
    authority: c.authority,
    // Gare pubblicate da un ente del territorio: il criterio territoriale confronta la regione.
    level: /\bREGIONE\b/i.test(c.authority) ? "Regionale" : /MINISTER|AGENZIA|PROVVEDITORAT/i.test(c.authority) ? "Nazionale" : "Locale",
    status: c.deadline && c.deadline < today ? "Chiuso" : "Aperto",
    theme: c.cpv.split(", ")[0] ?? "",
    territory: c.territory,
    eligible_subject_types: ["impresa"],
    packs: ["engineering-procurement"],
    budget_totale: c.amount,
    cofinanziamento_richiesto_pct: 0,
    deadline: c.deadline,
    replicabile: false,
    competenze_richieste: c.competenze,
    source_id: sourceId,
    source_url: c.documentsUrl ?? "https://pubblicitalegale.anticorruzione.it/bandi",
    verified_at: new Date().toISOString(),
    needs_review: true,
    review_notes: notes,
  };
}

/** Campi confrontati per capire se un bando già noto è cambiato. */
const WATCHED = ["title", "deadline", "budget_totale", "status", "source_url"] as const;

export async function runAnac(supabase: SupabaseClient, workspaceId: string): Promise<RunSummary> {
  const { data: settings } = await supabase
    .from("connector_settings")
    .select("filters, enabled")
    .eq("workspace_id", workspaceId)
    .eq("connector", "anac")
    .maybeSingle();
  const filters: AnacFilters = { ...DEFAULT_ANAC_FILTERS, ...((settings?.filters as Partial<AnacFilters>) ?? {}) };

  // Finestra: dall'ultimo controllo riuscito (con un giorno di sovrapposizione), altrimenti
  // gli ultimi N giorni indicati nei filtri.
  const { data: last } = await supabase
    .from("ingestion_runs")
    .select("window_to")
    .eq("workspace_id", workspaceId)
    .eq("connector", "anac")
    .eq("status", "completato")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const to = new Date();
  const from = last?.window_to
    ? new Date(new Date(last.window_to).getTime() - DAY)
    : new Date(to.getTime() - filters.giorniIndietro * DAY);

  const { data: run, error: runError } = await supabase
    .from("ingestion_runs")
    .insert({ workspace_id: workspaceId, connector: "anac", window_from: iso(from), window_to: iso(to) })
    .select("id")
    .single();
  if (runError || !run) throw new Error("Controllo non avviato: servono i permessi di modifica.");

  try {
    const today = iso(to);
    const candidates = await fetchAnac(filters, from, to);
    const rejected: Record<string, number> = {};
    const kept = candidates.filter((c) => {
      const reason = rejectReason(c, filters, today);
      if (reason) rejected[reason] = (rejected[reason] ?? 0) + 1;
      return !reason;
    });

    // Un appalto può comparire con più avvisi (bando, rettifica): vale il più recente.
    const byCode = new Map<string, AnacCandidate>();
    for (const c of kept) byCode.set(c.externalCode, c);

    const { data: source } = await supabase.from("sources").select("id").eq("workspace_id", workspaceId).ilike("name", "ANAC%").limit(1).maybeSingle();
    const codes = [...byCode.keys()];
    const { data: existing } = codes.length
      ? await supabase.from("opportunities").select("*").eq("workspace_id", workspaceId).in("external_code", codes)
      : { data: [] as Record<string, unknown>[] };
    const existingByCode = new Map((existing ?? []).map((r) => [r.external_code as string, r]));

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    for (const [code, c] of byCode) {
      const row = toRow(c, workspaceId, source?.id ?? null, today);
      const prev = existingByCode.get(code);
      if (!prev) {
        const { error } = await supabase.from("opportunities").insert(row);
        if (error) throw new Error(`Inserimento non riuscito: ${error.message}`);
        inserted++;
        continue;
      }
      const changes = WATCHED.filter((k) => String(prev[k] ?? "") !== String(row[k] ?? "")).map((k) => ({
        field: k,
        previous: prev[k],
        current: row[k],
      }));
      if (!changes.length) {
        skipped++;
        continue;
      }
      await supabase.from("opportunity_revisions").insert({
        workspace_id: workspaceId,
        opportunity_id: prev.id,
        changes,
        snapshot: prev,
      });
      // Si aggiornano solo i campi che vengono dalla fonte: note e verifiche del team restano.
      const patch = Object.fromEntries(changes.map((ch) => [ch.field, ch.current]));
      await supabase.from("opportunities").update({ ...patch, needs_review: true }).eq("id", prev.id);
      updated++;
    }

    const summary = { found: candidates.length, inserted, updated, skipped };
    await supabase
      .from("ingestion_runs")
      .update({
        status: "completato",
        ...summary,
        message: Object.keys(rejected).length
          ? `Esclusi dai filtri: ${Object.entries(rejected).map(([k, v]) => `${v} per ${k}`).join(", ")}`
          : null,
        finished_at: new Date().toISOString(),
      })
      .eq("id", run.id);
    return { runId: run.id, ...summary, rejected };
  } catch (e) {
    await supabase
      .from("ingestion_runs")
      .update({ status: "errore", message: e instanceof Error ? e.message : String(e), finished_at: new Date().toISOString() })
      .eq("id", run.id);
    throw e;
  }
}
