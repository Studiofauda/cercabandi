/**
 * Lettore della Piattaforma di Pubblicità Legale di ANAC.
 *
 * Usa la «ricerca avanzata» del servizio (filtro per codice CPV e per data di
 * pubblicazione); tipo di avviso, luogo, importo e parole escluse si filtrano qui, perché
 * il servizio non li accetta insieme al CPV. Il servizio è la versione «v0», non
 * documentata: se ANAC la cambia, questo è l'unico file da aggiornare.
 */

import type { TechnicalSkill } from "@/core/types";
import { regioneBreve, resolveLuogo, type Luogo } from "@/lib/geo";

const ENDPOINT = "https://pubblicitalegale.anticorruzione.it/api/v0/avvisi-full-text-specializzata";
/** Il programma si presenta con il suo nome (vedi docs/censimento-fonti.md). */
const USER_AGENT = "CercaBandi/0.1 (studiofauda.com; monitoraggio bandi)";
/** Una richiesta al secondo, come la documentazione di terzi suggerisce. */
const PAUSE_MS = 1000;
const MAX_PAGES = 20;

export interface AnacFilters {
  /** Codici CPV o loro prefissi (almeno 3 cifre). */
  cpv: string[];
  /** Nomi delle regioni come nell'elenco ISTAT; vuoto = tutta Italia. */
  regioni: string[];
  /** Tipologie ANAC da tenere (es. BANDI, INDAGINI_DI_MERCATO_SOTTO_SOGLIA). */
  tipologie: string[];
  importoMin: number | null;
  importoMax: number | null;
  /** Parole che, se presenti nel titolo o nella descrizione, escludono l'avviso. */
  escludi: string[];
  soloAperti: boolean;
  /** Quanti giorni indietro guardare al primo controllo. */
  giorniIndietro: number;
}

export const DEFAULT_ANAC_FILTERS: AnacFilters = {
  cpv: ["712", "713", "714"],
  regioni: ["Piemonte", "Puglia"],
  tipologie: ["BANDI", "INDAGINI_DI_MERCATO_SOTTO_SOGLIA"],
  importoMin: null,
  importoMax: null,
  escludi: [],
  soloAperti: true,
  giorniIndietro: 7,
};

/** Tipologie di avviso con cui ci si può ancora candidare. */
export const ANAC_TIPOLOGIE: Record<string, string> = {
  BANDI: "Bandi di gara",
  INDAGINI_DI_MERCATO_SOTTO_SOGLIA: "Indagini di mercato e manifestazioni di interesse",
};

/** Famiglie CPV più utili per servizi tecnici, come scorciatoie nella pagina dei filtri. */
export const CPV_PRESETS: Array<{ code: string; label: string }> = [
  { code: "712", label: "Servizi architettonici" },
  { code: "713", label: "Servizi di ingegneria" },
  { code: "714", label: "Urbanistica e architettura del paesaggio" },
  { code: "715", label: "Servizi connessi all'edilizia" },
  { code: "716", label: "Prove tecniche, analisi e consulenza" },
  { code: "717", label: "Monitoraggio e controllo" },
  { code: "718", label: "Consulenza su acqua e rifiuti" },
  { code: "905", label: "Servizi ambientali e rifiuti" },
  { code: "452", label: "Lavori di costruzione (opere civili)" },
  { code: "453", label: "Lavori di impiantistica" },
];

// ---------------------------------------------------------------------------

/** Un avviso ANAC tradotto nei campi di un bando. */
export interface AnacCandidate {
  externalCode: string;
  idAvviso: string;
  tipologia: string;
  title: string;
  description: string;
  authority: string;
  deadline: string | null;
  publishedAt: string;
  amount: number | null;
  cpv: string;
  cigs: string[];
  luogo: Luogo;
  territory: string;
  documentsUrl: string | null;
  competenze: TechnicalSkill[];
}

type Json = Record<string, unknown>;
const asArray = (v: unknown): Json[] => (Array.isArray(v) ? (v as Json[]) : []);
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

const ddmmyyyy = (d: Date) =>
  `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;

/** Competenze citate in modo esplicito nel testo: solo proposte, da verificare. */
const SKILL_WORDS: Array<[RegExp, TechnicalSkill]> = [
  [/\bC\.?S\.?P\b|\bC\.?S\.?E\b|coordinament\w* (della |per la )?sicurezza/i, "sicurezza-cantiere"],
  [/direzione (dei )?lavori/i, "direzione-lavori"],
  [/geolog|geotecn/i, "geologia-geotecnica"],
  [/struttural|sismic/i, "progettazione-strutturale"],
  [/impiant/i, "progettazione-impiantistica"],
  [/collaud/i, "collaudo"],
  [/restaur|vincol|beni culturali/i, "restauro"],
  [/antincendio|prevenzione incendi/i, "antincendio-prevenzione"],
  [/\bBIM\b/i, "bim"],
  [/idraulic|dissesto|idrogeolog/i, "idraulica"],
  // Solo espressioni per esteso: negli avvisi in maiuscolo «VIA», «DL» o «APE» sarebbero ambigui.
  [/efficient\w* energetic|diagnosi energetic|prestazione energetica/i, "energia-certificazione"],
  [/valutazione (di )?impatto ambientale|valutazione ambientale strategica/i, "ambiente-valutazioni"],
  [/paesaggi|urbanistic/i, "urbanistica-paesaggio"],
];

function normalizeNotice(n: Json): AnacCandidate | null {
  const template = (asArray(n.templates)[0]?.template ?? {}) as Json;
  const sections = asArray(template.sections);
  const fields = Object.assign({}, ...sections.map((s) => (s.fields as Json) ?? {})) as Json;
  const items = sections.flatMap((s) => asArray(s.items));
  const first = items[0] ?? {};

  const idAvviso = str(n.idAvviso);
  const idAppalto = str(n.idAppalto) ?? idAvviso;
  if (!idAvviso || !idAppalto) return null;

  const description = str(first.descrizione) ?? str((template.metadata as Json)?.descrizione) ?? "";
  const title = str((template.metadata as Json)?.titolo) ?? description;
  const authority = str(asArray(fields.soggetti_sa)[0]?.denominazione_amministrazione) ?? "Stazione appaltante non indicata";
  const amounts = items.map((i) => i.valore_complessivo_stimato).filter((v): v is number => typeof v === "number");
  const amount = amounts.length ? amounts.reduce((a, b) => a + b, 0) : null;

  const comune = str(first.luogo_istat);
  const area = items.map((i) => str(i.luogo_nuts)).find(Boolean) ?? null;
  const luogo = resolveLuogo(comune, area);
  const regione = luogo.regioni.length === 1 ? regioneBreve(luogo.regioni[0]) : null;
  const territory = [
    comune ? `${comune.charAt(0)}${comune.slice(1).toLowerCase()}${luogo.sigla ? ` (${luogo.sigla})` : ""}` : null,
    regione,
  ]
    .filter(Boolean)
    .join(" · ") || "Luogo da verificare";

  const text = `${title} ${description}`;
  return {
    externalCode: `ANAC ${idAppalto}`,
    idAvviso,
    tipologia: str(n.tipologia) ?? "",
    title: title.length > 220 ? `${title.slice(0, 217)}…` : title,
    description,
    authority,
    deadline: str(n.dataScadenza)?.slice(0, 10) ?? null,
    publishedAt: str(n.dataPubblicazione)?.slice(0, 10) ?? "",
    amount,
    cpv: [...new Set(items.map((i) => str(i.cpv)).filter(Boolean))].join(", "),
    cigs: [...new Set(items.map((i) => str(i.cig)).filter((c): c is string => !!c))],
    luogo,
    territory,
    documentsUrl: str(fields.documenti_di_gara_link) ?? str(first.documenti_di_gara_link),
    competenze: [...new Set(SKILL_WORDS.filter(([re]) => re.test(text)).map(([, s]) => s))],
  };
}

/** Motivo per cui un avviso non passa i filtri, oppure null se passa. */
export function rejectReason(c: AnacCandidate, f: AnacFilters, today: string): string | null {
  if (f.tipologie.length && !f.tipologie.includes(c.tipologia)) return "tipologia";
  if (f.soloAperti && c.deadline && c.deadline < today) return "scaduto";
  // Un luogo incerto non esclude: meglio un bando in più da verificare che uno perso.
  if (f.regioni.length && c.luogo.regioni.length && !c.luogo.regioni.some((r) => f.regioni.includes(regioneBreve(r)) || f.regioni.includes(r)))
    return "regione";
  if (f.importoMin !== null && c.amount !== null && c.amount < f.importoMin) return "importo";
  if (f.importoMax !== null && c.amount !== null && c.amount > f.importoMax) return "importo";
  const text = `${c.title} ${c.description}`.toLowerCase();
  if (f.escludi.some((w) => w.trim() && text.includes(w.trim().toLowerCase()))) return "parole escluse";
  return null;
}

/** Legge gli avvisi pubblicati tra due date (comprese) con i CPV indicati. */
export async function fetchAnac(filters: AnacFilters, from: Date, to: Date): Promise<AnacCandidate[]> {
  if (!filters.cpv.length) throw new Error("Indica almeno un codice CPV nei filtri ANAC.");
  const base = new URLSearchParams({
    pageSize: "100",
    dataPubblicazioneStart: ddmmyyyy(from),
    dataPubblicazioneEnd: ddmmyyyy(to),
    sortField: "dataPubblicazione",
    sortDirection: "asc",
    operatore: "AND",
    cpv: filters.cpv.join(","),
  });

  const seen = new Set<string>();
  const out: AnacCandidate[] = [];
  let token = "";
  for (let page = 0; page < MAX_PAGES; page++) {
    const params = new URLSearchParams(base);
    if (token) {
      params.set("direzionePaginazione", "AVANTI");
      params.set("tokenPaginazione", token);
    }
    const res = await fetch(`${ENDPOINT}?${params}`, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" }, cache: "no-store" });
    if (!res.ok) throw new Error(`ANAC ha risposto ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const body = (await res.json()) as { content?: Json[]; lastPaginationToken?: string };
    const content = body.content ?? [];
    let added = 0;
    for (const n of content) {
      const c = normalizeNotice(n);
      if (!c || seen.has(c.idAvviso)) continue;
      seen.add(c.idAvviso);
      out.push(c);
      added++;
    }
    if (!added || !body.lastPaginationToken) break;
    token = body.lastPaginationToken;
    await new Promise((r) => setTimeout(r, PAUSE_MS));
  }
  return out;
}
