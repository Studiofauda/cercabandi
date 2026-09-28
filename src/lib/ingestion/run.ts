/**
 * Un controllo di una fonte: legge gli avvisi, applica i filtri e scrive nel database i
 * bandi nuovi o modificati. Lo storico non si sovrascrive: ogni modifica a un bando già
 * noto genera una revisione.
 *
 * Il client Supabase è quello dell'utente che ha premuto «Controlla ora» (le scritture
 * passano dalle regole di accesso), oppure quello con la chiave segreta del controllo
 * automatico del mattino.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAnac, rejectReason, DEFAULT_ANAC_FILTERS, type AnacCandidate, type AnacFilters } from "./anac";
import { fetchSedia, rejectSedia, DEFAULT_SEDIA_FILTERS, type SediaCandidate, type SediaFilters } from "./sedia";
import { date, euro } from "@/lib/format";

export type Connector = "anac" | "sedia";

export interface RunSummary {
  runId: string;
  found: number;
  inserted: number;
  updated: number;
  skipped: number;
  rejected: Record<string, number>;
}

type Row = Record<string, unknown> & { external_code: string };

const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Impronta dei filtri: se cambia, il controllo ricerca di nuovo tutto il periodo iniziale. */
function filtersHash(f: object): string {
  const { ricerca: _ricerca, ...rest } = f as Record<string, unknown>;
  const text = JSON.stringify(rest, Object.keys(rest).sort());
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

async function loadFilters<T>(supabase: SupabaseClient, workspaceId: string, connector: Connector, profileId: string, defaults: T): Promise<T> {
  const { data } = await supabase
    .from("connector_settings")
    .select("filters")
    .eq("workspace_id", workspaceId)
    .eq("connector", connector)
    .eq("profile_id", profileId)
    .maybeSingle();
  return { ...defaults, ...((data?.filters as Partial<T>) ?? {}) };
}

async function sourceId(supabase: SupabaseClient, workspaceId: string, namePattern: string) {
  const { data } = await supabase.from("sources").select("id").eq("workspace_id", workspaceId).ilike("name", namePattern).limit(1).maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

/**
 * Le letture dalle fonti non dipendono dal profilo (i filtri si applicano dopo): nello
 * stesso controllo del mattino, profili con la stessa richiesta riusano la lettura invece
 * di ripeterla. Vale 10 minuti, poi si legge di nuovo.
 */
const READ_CACHE = new Map<string, { at: number; value: Promise<unknown> }>();
function cachedRead<T>(key: string, read: () => Promise<T>): Promise<T> {
  const hit = READ_CACHE.get(key);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.value as Promise<T>;
  const value = read();
  READ_CACHE.set(key, { at: Date.now(), value });
  // Una lettura fallita non resta in memoria: il profilo successivo riprova.
  value.catch(() => READ_CACHE.delete(key));
  return value;
}

/** Campi confrontati per capire se un bando già noto è cambiato. */
const WATCHED = ["title", "deadline", "budget_totale", "status", "source_url"] as const;

/**
 * Esegue un controllo: registra l'avvio, chiama la lettura, scrive nuovi e modificati,
 * registra l'esito (anche in caso di errore).
 */
async function execute(
  supabase: SupabaseClient,
  meta: { workspaceId: string; profileId: string; connector: Connector; hash: string; from: Date | null; to: Date },
  read: () => Promise<{ found: number; rows: Row[]; rejected: Record<string, number> }>
): Promise<RunSummary> {
  const { data: run, error: runError } = await supabase
    .from("ingestion_runs")
    .insert({
      workspace_id: meta.workspaceId,
      connector: meta.connector,
      profile_id: meta.profileId,
      filters_hash: meta.hash,
      window_from: meta.from ? iso(meta.from) : null,
      window_to: iso(meta.to),
    })
    .select("id")
    .single();
  if (runError || !run) throw new Error("Controllo non avviato: servono i permessi di modifica.");

  try {
    const { found, rows, rejected } = await read();
    // Lo stesso bando può comparire più volte (es. bando e rettifica): vale l'ultimo.
    const byCode = new Map(rows.map((r) => [r.external_code, r]));
    const codes = [...byCode.keys()];
    const { data: existing } = codes.length
      ? await supabase.from("opportunities").select("*").eq("workspace_id", meta.workspaceId).in("external_code", codes)
      : { data: [] as Record<string, unknown>[] };
    const existingByCode = new Map((existing ?? []).map((r) => [r.external_code as string, r]));

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    for (const [code, row] of byCode) {
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
      await supabase.from("opportunity_revisions").insert({ workspace_id: meta.workspaceId, opportunity_id: prev.id, changes, snapshot: prev });
      // Si aggiornano solo i campi che vengono dalla fonte: note e verifiche del team restano.
      const patch = Object.fromEntries(changes.map((ch) => [ch.field, ch.current]));
      await supabase.from("opportunities").update({ ...patch, needs_review: true }).eq("id", prev.id);
      updated++;
    }

    const summary = { found, inserted, updated, skipped };
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

function applyFilter<C>(candidates: C[], reject: (c: C) => string | null) {
  const rejected: Record<string, number> = {};
  const kept = candidates.filter((c) => {
    const reason = reject(c);
    if (reason) rejected[reason] = (rejected[reason] ?? 0) + 1;
    return !reason;
  });
  return { kept, rejected };
}

// ---------------------------------------------------------------------------
// ANAC · Pubblicità legale
// ---------------------------------------------------------------------------

function anacRow(c: AnacCandidate, workspaceId: string, source: string | null, today: string): Row {
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
    kind: "gara",
    title: c.title,
    authority: c.authority,
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
    source_id: source,
    source_url: c.documentsUrl ?? "https://pubblicitalegale.anticorruzione.it/bandi",
    verified_at: new Date().toISOString(),
    needs_review: true,
    review_notes: notes,
  };
}

export async function runAnac(supabase: SupabaseClient, workspaceId: string, profileId: string): Promise<RunSummary> {
  const filters = await loadFilters<AnacFilters>(supabase, workspaceId, "anac", profileId, DEFAULT_ANAC_FILTERS);
  const hash = filtersHash(filters);

  // Finestra: dall'ultimo controllo riuscito con gli stessi filtri (con un giorno di
  // sovrapposizione). Se i filtri sono cambiati, o è il primo controllo, gli ultimi N
  // giorni indicati: altrimenti cambiando regione non si vedrebbero i bandi dei giorni prima.
  const { data: last } = await supabase
    .from("ingestion_runs")
    .select("window_to, filters_hash")
    .eq("workspace_id", workspaceId)
    .eq("connector", "anac")
    .eq("profile_id", profileId)
    .eq("status", "completato")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const to = new Date();
  const from =
    last?.window_to && last.filters_hash === hash
      ? new Date(new Date(last.window_to).getTime() - DAY)
      : new Date(to.getTime() - filters.giorniIndietro * DAY);
  const today = iso(to);

  return execute(supabase, { workspaceId, profileId, connector: "anac", hash, from, to }, async () => {
    const candidates = await cachedRead(`anac:${[...filters.cpv].sort()}:${iso(from)}:${iso(to)}`, () => fetchAnac(filters, from, to));
    const { kept, rejected } = applyFilter(candidates, (c) => rejectReason(c, filters, today));
    const source = await sourceId(supabase, workspaceId, "ANAC%");
    return { found: candidates.length, rows: kept.map((c) => anacRow(c, workspaceId, source, today)), rejected };
  });
}

// ---------------------------------------------------------------------------
// Funding & Tenders (UE)
// ---------------------------------------------------------------------------

function sediaRow(c: SediaCandidate, workspaceId: string, source: string | null): Row {
  const notes = [
    `Trovato su Funding & Tenders il ${date(new Date().toISOString())}.`,
    `Programma: ${c.programme}. Codice: ${c.identifier}.`,
    c.typeOfAction ? `Tipo di azione: ${c.typeOfAction}.` : null,
    c.allDeadlines.length ? `Scadenze: ${c.allDeadlines.map((d) => date(d)).join(", ")}.` : "Scadenza non ancora pubblicata.",
    c.budget !== null ? `Budget del bando: ${euro(c.budget)} (totale, non per progetto).` : null,
    c.cascade ? "Bando «a cascata» gestito da un progetto già finanziato dall'UE." : null,
    "Soggetti ammessi e cofinanziamento: da verificare sul testo del bando (di norma enti pubblici, imprese e organizzazioni; spesso in consorzio).",
    "",
    c.summary,
  ]
    .filter((l) => l !== null)
    .join("\n");

  return {
    workspace_id: workspaceId,
    external_code: c.externalCode,
    origin: "sedia",
    kind: "contributo",
    title: c.title,
    authority: `Commissione europea · ${c.programme}`,
    level: "Europeo",
    status: c.status,
    theme: c.typeOfAction || c.programme,
    territory: "Unione europea",
    eligible_subject_types: ["ente-pubblico", "impresa", "associazione"],
    packs: c.packs,
    funding_source: "UE",
    budget_totale: c.budget,
    deadline: c.deadline,
    expected_publication: c.status === "In arrivo" ? c.startDate : null,
    replicabile: false,
    source_id: source,
    source_url: c.url,
    verified_at: new Date().toISOString(),
    needs_review: true,
    review_notes: notes,
  };
}

export async function runSedia(supabase: SupabaseClient, workspaceId: string, profileId: string): Promise<RunSummary> {
  const filters = await loadFilters<SediaFilters>(supabase, workspaceId, "sedia", profileId, DEFAULT_SEDIA_FILTERS);
  const to = new Date();
  const today = iso(to);
  // Si leggono ogni volta tutti i bandi aperti o in arrivo: sono poche centinaia e il
  // riconoscimento dei doppioni evita di reinserirli.
  return execute(supabase, { workspaceId, profileId, connector: "sedia", hash: filtersHash(filters), from: null, to }, async () => {
    const key = `sedia:${[...filters.programmi].sort()}:${filters.inArrivo}:${filters.cascata}:${today}`;
    const candidates = await cachedRead(key, () => fetchSedia(filters, today));
    const { kept, rejected } = applyFilter(candidates, (c) => rejectSedia(c, filters));
    const source = await sourceId(supabase, workspaceId, "Funding%");
    return { found: candidates.length, rows: kept.map((c) => sediaRow(c, workspaceId, source)), rejected };
  });
}

export const RUNNERS: Record<Connector, typeof runAnac> = { anac: runAnac, sedia: runSedia };
