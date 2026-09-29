/**
 * Lettore del portale europeo Funding & Tenders (servizio di ricerca «SEDIA»).
 *
 * Il servizio è pubblico (chiave fissa «SEDIA»). Si leggono tutti i bandi aperti o in
 * arrivo, eventualmente limitati ai programmi scelti; parole chiave ed esclusioni si
 * applicano qui. Attenzione: lo stato «aperto» del portale non è affidabile (restano
 * «aperti» bandi con scadenze passate), quindi lo stato si ricalcola dalle scadenze.
 */

import type { PackId } from "@/core/types";
import { textHas } from "./anac";

const ENDPOINT = "https://api.tech.ec.europa.eu/search-api/prod/rest/search";
const FACET_ENDPOINT = "https://api.tech.ec.europa.eu/search-api/prod/rest/facet";
const USER_AGENT = "CercaBandi/0.1 (studiofauda.com; monitoraggio bandi)";
const PAGE_SIZE = 100;
const MAX_PAGES = 15;
// Il portale UE non dichiara limiti: una breve pausa basta, e tiene il controllo del mattino entro i 60 secondi.
const PAUSE_MS = 300;

const STATUS_FORTHCOMING = "31094501";
const STATUS_OPEN = "31094502";

export interface SediaFilters {
  /** Codici dei programmi (vuoto = tutti). */
  programmi: string[];
  /** Parole o radici (in inglese: i bandi sono in inglese), almeno una deve comparire. */
  includi: string[];
  escludi: string[];
  /** Tenere anche i bandi annunciati ma non ancora aperti. */
  inArrivo: boolean;
  /** Tenere anche i bandi «a cascata» gestiti da progetti già finanziati (FSTP). */
  cascata: boolean;
  /** Budget minimo del bando (€), facoltativo. */
  budgetMin: number | null;
  ricerca: string;
}

export const DEFAULT_SEDIA_FILTERS: SediaFilters = {
  // Impostato sotto: i programmi dell'elenco (esclusi difesa, nucleare, azione esterna).
  programmi: [],
  includi: [],
  escludi: [],
  inArrivo: true,
  cascata: false,
  budgetMin: null,
  ricerca: "",
};

/** Programmi europei principali, con gli ambiti di Cercabandi a cui si collegano di solito. */
export const SEDIA_PROGRAMMES: Array<{ code: string; label: string; packs: PackId[] }> = [
  { code: "43108390", label: "Horizon Europe (ricerca e innovazione)", packs: [] },
  { code: "43252405", label: "LIFE (ambiente e clima)", packs: ["energy", "agri-rural"] },
  { code: "43152860", label: "Digital Europe", packs: ["culture-digital"] },
  { code: "43251567", label: "Connecting Europe Facility (infrastrutture)", packs: ["engineering-procurement", "energy"] },
  { code: "43251589", label: "CERV (cittadini, uguaglianza, diritti)", packs: ["civic-nonprofit"] },
  { code: "43251814", label: "Europa Creativa", packs: ["culture-digital"] },
  { code: "43353764", label: "Erasmus+", packs: ["civic-nonprofit"] },
  { code: "43254037", label: "Corpo europeo di solidarietà", packs: ["civic-nonprofit"] },
  { code: "43254019", label: "Fondo sociale europeo", packs: ["civic-nonprofit", "health"] },
  { code: "44773066", label: "Meccanismo per una transizione giusta", packs: ["public-territorial", "energy"] },
  { code: "43089234", label: "Innovation Fund", packs: ["energy"] },
  { code: "43392145", label: "Fondo per la pesca e l'acquacoltura (FEAMPA)", packs: ["agri-rural"] },
  { code: "43252476", label: "Programma per il mercato unico", packs: [] },
  { code: "44416173", label: "Investimenti interregionali per l'innovazione (I3)", packs: ["public-territorial"] },
];

// Di partenza si leggono solo i programmi utili ai profili di Cercabandi.
DEFAULT_SEDIA_FILTERS.programmi = SEDIA_PROGRAMMES.map((p) => p.code);

/** Parole del titolo che indicano un ambito, per i programmi generici come Horizon. */
const PACK_WORDS: Array<[RegExp, PackId[]]> = [
  [/\b(energ|renewable|efficien|decarboni|hydrogen|solar|heating)/i, ["energy"]],
  [/\b(biodivers|nature|agri|farm|forest|food|rural|soil|water|ocean|marine|fisher)/i, ["agri-rural"]],
  [/\b(cultur|heritage|creative|media|digital|artificial intelligence|museum)|\bAI\b|\bdata\b/i, ["culture-digital"]],
  [/\b(health|medical|disease|cancer|pandemic)|\bcare\b/i, ["health"]],
  [/\btouris/i, ["tourism"]],
  [/\b(citizen|democra|civil society|inclusion|youth|equality|social|gender|rights)/i, ["civic-nonprofit"]],
  [/\b(building|construction|infrastructur|mobility|transport|urban|cities|bridge|road|resilien)/i, ["engineering-procurement", "public-territorial"]],
  [/\b(municipal|local authorit|public authorit|territor)|\bregions?\b/i, ["public-territorial"]],
];

export interface SediaCandidate {
  externalCode: string;
  identifier: string;
  title: string;
  programme: string;
  programmeCode: string;
  typeOfAction: string;
  status: "Aperto" | "In arrivo";
  deadline: string | null;
  allDeadlines: string[];
  startDate: string | null;
  budget: number | null;
  summary: string;
  url: string;
  packs: PackId[];
  cascade: boolean;
}

type Meta = Record<string, unknown[] | undefined>;
const first = (m: Meta, k: string) => (Array.isArray(m[k]) && m[k]!.length ? String(m[k]![0]) : null);
const stripHtml = (s: string) =>
  s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

function normalize(r: { metadata?: Meta; summary?: string; url?: string }, today: string, programmeNames: Map<string, string>): SediaCandidate | null {
  const m = r.metadata ?? {};
  const identifier = first(m, "identifier");
  if (!identifier) return null;
  const statusCode = first(m, "status");
  const deadlines = ((m.deadlineDate as string[] | undefined) ?? []).map((d) => d.slice(0, 10)).sort();
  const next = deadlines.find((d) => d >= today) ?? null;
  // Il portale lascia «aperti» e «in arrivo» anche bandi superati da anni. Aperto: c'è una
  // scadenza futura. In arrivo: annunciato, senza scadenza futura ma con apertura recente o
  // futura (entro gli ultimi 60 giorni). Tutto il resto si scarta.
  const startDate = first(m, "startDate")?.slice(0, 10) ?? null;
  const recentStart = startDate !== null && startDate >= new Date(Date.parse(today) - 60 * 86_400_000).toISOString().slice(0, 10);
  const status = next ? (statusCode === STATUS_FORTHCOMING ? "In arrivo" : "Aperto") : statusCode === STATUS_FORTHCOMING && recentStart ? "In arrivo" : null;
  if (!status) return null;

  const programmeCode = first(m, "frameworkProgramme") ?? "";
  const programme = programmeNames.get(programmeCode) ?? "Programma UE";
  const title = first(m, "title") ?? first(m, "callTitle") ?? r.summary ?? identifier;
  const cascade = first(m, "type") === "8";
  const text = `${title} ${first(m, "callTitle") ?? ""}`;
  const packs = new Set<PackId>(SEDIA_PROGRAMMES.find((p) => p.code === programmeCode)?.packs ?? []);
  for (const [re, ps] of PACK_WORDS) if (re.test(text)) ps.forEach((p) => packs.add(p));
  const budget = Number(first(m, "budget"));

  return {
    externalCode: `UE ${identifier}`,
    identifier,
    title: title.length > 220 ? `${title.slice(0, 217)}…` : title,
    programme,
    programmeCode,
    typeOfAction: ((m.typesOfAction as string[] | undefined) ?? []).join(", "),
    status,
    deadline: next,
    allDeadlines: deadlines,
    startDate,
    budget: Number.isFinite(budget) && budget > 0 ? budget : null,
    summary: stripHtml(first(m, "description") ?? first(m, "furtherInformation") ?? r.summary ?? "").slice(0, 1500),
    url: cascade
      ? (first(m, "url") ?? r.url ?? "")
      : `https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details/${encodeURIComponent(identifier)}`,
    packs: [...packs],
    cascade,
  };
}

export function rejectSedia(c: SediaCandidate, f: SediaFilters): string | null {
  if (c.status === "In arrivo" && !f.inArrivo) return "in arrivo";
  if (c.cascade && !f.cascata) return "a cascata";
  if (f.budgetMin !== null && c.budget !== null && c.budget < f.budgetMin) return "budget";
  const text = `${c.title} ${c.summary}`;
  if (f.includi.length && !f.includi.some((w) => textHas(text, w))) return "parole chiave";
  if (f.escludi.some((w) => textHas(text, w))) return "parole escluse";
  return null;
}

async function post(query: object, page: number, facet = false) {
  const form = new FormData();
  form.append("query", new Blob([JSON.stringify(query)], { type: "application/json" }));
  form.append("languages", new Blob([JSON.stringify(["en"])], { type: "application/json" }));
  if (!facet) form.append("sort", new Blob([JSON.stringify({ field: "deadlineDate", order: "ASC" })], { type: "application/json" }));
  const url = facet
    ? `${FACET_ENDPOINT}?apiKey=SEDIA&text=***`
    : `${ENDPOINT}?apiKey=SEDIA&text=***&pageSize=${PAGE_SIZE}&pageNumber=${page}`;
  const res = await fetch(url, { method: "POST", body: form, headers: { "User-Agent": USER_AGENT }, cache: "no-store" });
  if (!res.ok) throw new Error(`Funding & Tenders ha risposto ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

/** Legge i bandi aperti o in arrivo, eventualmente limitati ad alcuni programmi. */
export async function fetchSedia(filters: SediaFilters, today: string): Promise<SediaCandidate[]> {
  const must: object[] = [
    { terms: { type: filters.cascata ? ["1", "2", "8"] : ["1", "2"] } },
    { terms: { status: filters.inArrivo ? [STATUS_FORTHCOMING, STATUS_OPEN] : [STATUS_OPEN] } },
  ];
  if (filters.programmi.length) must.push({ terms: { frameworkProgramme: filters.programmi } });
  const query = { bool: { must } };

  // Nomi dei programmi dal portale stesso (per quelli non in elenco).
  const programmeNames = new Map(SEDIA_PROGRAMMES.map((p) => [p.code, p.label]));
  try {
    const facets = (await post(query, 1, true)) as { facets?: Array<{ name: string; values: Array<{ rawValue: string; value: string }> }> };
    for (const v of facets.facets?.find((f) => f.name === "frameworkProgramme")?.values ?? []) {
      if (!programmeNames.has(v.rawValue)) programmeNames.set(v.rawValue, v.value.trim());
    }
  } catch {
    // I nomi servono solo a leggere meglio: senza, si usa «Programma UE».
  }

  const out: SediaCandidate[] = [];
  const seen = new Set<string>();
  for (let page = 1; page <= MAX_PAGES; page++) {
    await new Promise((r) => setTimeout(r, PAUSE_MS));
    const body = (await post(query, page)) as { results?: Array<{ metadata?: Meta; summary?: string; url?: string }>; totalResults?: number };
    const results = body.results ?? [];
    for (const r of results) {
      const c = normalize(r, today, programmeNames);
      if (!c || seen.has(c.externalCode)) continue;
      seen.add(c.externalCode);
      out.push(c);
    }
    if (results.length < PAGE_SIZE || page * PAGE_SIZE >= (body.totalResults ?? 0)) break;
  }
  return out;
}
