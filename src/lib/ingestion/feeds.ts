/**
 * Lettore di feed e API dei siti di Regione Piemonte, fondazioni e GSE.
 *
 * Ogni fonte pubblica un elenco (RSS o API di WordPress) con titolo, link e data; la
 * scadenza non è mai un campo a sé e si ricava dal testo («Scadenza: 30 ottobre 2026»,
 * «entro il 10 dicembre 2026»). Dove il feed non ha testo, si apre la pagina del bando.
 * Il programma si presenta con il suo nome e rispetta una pausa tra le richieste.
 */

import type { PackId, SubjectType } from "@/core/types";
import { textHas } from "./anac";

const USER_AGENT = "CercaBandi/0.1 (studiofauda.com; monitoraggio bandi)";
// Mezzo secondo tra le richieste allo stesso sito: sufficiente per siti istituzionali.
const PAUSE_MS = 500;

export interface FeedSource {
  key: string;
  label: string;
  url: string;
  format: "rss" | "wp";
  level: "Nazionale" | "Regionale";
  territory: string;
  eligible: SubjectType[];
  packs: PackId[];
  fundingSource: "Regionale" | "Nazionale" | "Privato";
  /** Nome della fonte nella tabella delle fonti, per il collegamento. */
  sourceName: string;
  /** Il feed non ha testo: la scadenza si cerca nella pagina del bando. */
  openDetail?: boolean;
  /** Solo le voci che contengono almeno una di queste parole sono bandi (es. notizie GSE). */
  mustMatch?: RegExp;
}

export const FEED_SOURCES: FeedSource[] = [
  {
    key: "piemonte",
    label: "Regione Piemonte · Contributi e finanziamenti",
    url: "https://bandi.regione.piemonte.it/contributi-finanziamenti/rss.xml",
    format: "rss",
    level: "Regionale",
    territory: "Piemonte",
    eligible: ["ente-pubblico", "impresa", "associazione"],
    packs: ["public-territorial"],
    fundingSource: "Regionale",
    sourceName: "Regione Piemonte · Bandi",
  },
  {
    key: "csp",
    label: "Fondazione Compagnia di San Paolo",
    url: "https://www.compagniadisanpaolo.it/it/contributi/feed/",
    format: "rss",
    level: "Regionale",
    territory: "Piemonte · Liguria · Valle d'Aosta",
    eligible: ["associazione", "ente-pubblico"],
    packs: ["private-philanthropy"],
    fundingSource: "Privato",
    sourceName: "Fondazione Compagnia di San Paolo",
    openDetail: true,
  },
  {
    key: "crt",
    label: "Fondazione CRT",
    url: "https://www.fondazionecrt.it/wp-json/wp/v2/bandi-progetti?per_page=20",
    format: "wp",
    level: "Regionale",
    territory: "Piemonte · Valle d'Aosta",
    eligible: ["associazione", "ente-pubblico"],
    packs: ["private-philanthropy"],
    fundingSource: "Privato",
    sourceName: "Fondazione CRT · Progetti e bandi",
  },
  {
    key: "consud",
    label: "Fondazione Con il Sud",
    url: "https://www.fondazioneconilsud.it/wp-json/wp/v2/bando?per_page=20",
    format: "wp",
    level: "Regionale",
    territory: "Sud Italia · Basilicata · Calabria · Campania · Puglia · Sardegna · Sicilia",
    eligible: ["associazione"],
    packs: ["private-philanthropy", "civic-nonprofit"],
    fundingSource: "Privato",
    sourceName: "Fondazione Con il Sud",
  },
  {
    key: "gse",
    label: "GSE · Incentivi per l'energia",
    url: "https://www.gse.it/_layouts/15/GSE.Internet2016/pages/GenerateFeedRSSNews.aspx",
    format: "rss",
    level: "Nazionale",
    territory: "Italia",
    eligible: ["ente-pubblico", "impresa", "associazione", "persona-fisica"],
    packs: ["energy"],
    fundingSource: "Nazionale",
    sourceName: "GSE",
    mustMatch: /\b(bando|bandi|avviso|incentiv|contribut|sportello|finestra|graduatori|domande|qualifica|conto termico|comunit[aà] energetic|\bcer\b)/i,
  },
];

export interface FeedFilters {
  fonti: string[];
  includi: string[];
  escludi: string[];
  /** Escludere i bandi con scadenza passata e gli esiti. */
  soloAperti: boolean;
  ricerca: string;
}

export const DEFAULT_FEED_FILTERS: FeedFilters = {
  fonti: FEED_SOURCES.map((f) => f.key),
  includi: [],
  escludi: [],
  soloAperti: true,
  ricerca: "",
};

/** Parole del testo che aggiungono un ambito al bando. */
const PACK_WORDS: Array<[RegExp, PackId[]]> = [
  [/\b(energ|fotovolt|rinnovabil|efficientament|comunit[aà] energetic)/i, ["energy"]],
  [/\b(cultur|patrimoni|museo|musei|artist|creativ|biblioteca|digital)/i, ["culture-digital"]],
  [/\b(agricol|rural|forest|agroaliment)/i, ["agri-rural"]],
  [/\b(sanit|salute|ospedal|disabil|anzian)/i, ["health"]],
  [/\b(turism|ricettiv)/i, ["tourism"]],
  [/\b(volontar|terzo settore|inclusion|giovan|comunit[aà]|social)/i, ["civic-nonprofit"]],
  [/\b(infrastruttur|edilizi|riqualificazion|rigenerazion|opere pubbliche|lavori)/i, ["engineering-procurement"]],
  [/\b(enti local|enti pubblic|amministrazioni comunali|comuni\b)/i, ["public-territorial"]],
];

const MONTHS: Record<string, string> = {
  gennaio: "01", febbraio: "02", marzo: "03", aprile: "04", maggio: "05", giugno: "06",
  luglio: "07", agosto: "08", settembre: "09", ottobre: "10", novembre: "11", dicembre: "12",
};

const DATE_RE = /(\d{1,2})\s*°?\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+(\d{4})|(\d{1,2})\/(\d{1,2})\/(\d{2,4})/gi;
/** Espressioni che introducono una scadenza. */
const DEADLINE_CUE = /(scad\w*|entro\b|termine|chiusura|fino al|non oltre)/i;

/** Tutte le date di scadenza citate nel testo (formato AAAA-MM-GG), in ordine. */
export function deadlinesInText(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(DATE_RE)) {
    const before = text.slice(Math.max(0, (m.index ?? 0) - 90), m.index);
    if (!DEADLINE_CUE.test(before)) continue;
    const [d, mo, y] = m[1] ? [m[1], MONTHS[m[2].toLowerCase()], m[3]] : [m[4], m[5], m[6].length === 2 ? `20${m[6]}` : m[6]];
    out.push(`${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`);
  }
  return [...new Set(out)].sort();
}

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&#39;|&apos;|&#8217;|&rsquo;/g, "'")
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
const plain = (html: string) => decode(decode(html)).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

export interface FeedCandidate {
  externalCode: string;
  source: FeedSource;
  title: string;
  summary: string;
  link: string;
  publishedAt: string;
  deadline: string | null;
  allDeadlines: string[];
  /** Il feed dichiara che è un esito o un bando chiuso. */
  closedBySource: boolean;
  packs: PackId[];
}

async function get(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, cache: "no-store" });
  if (!res.ok) throw new Error(`${new URL(url).hostname} ha risposto ${res.status}`);
  return res.text();
}

interface RawItem {
  title: string;
  link: string;
  date: string;
  body: string;
}

function parseRss(xml: string): RawItem[] {
  const tag = (it: string, t: string) => (it.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)) ?? [])[1] ?? "";
  return xml
    .split(/<item[\s>]/)
    .slice(1)
    .map((it) => ({
      title: plain(tag(it, "title")),
      link: plain(tag(it, "link")),
      date: plain(tag(it, "pubDate")),
      body: tag(it, "content:encoded") || tag(it, "description"),
    }));
}

function parseWp(json: string): RawItem[] {
  const items = JSON.parse(json) as Array<{ title?: { rendered?: string }; link?: string; date?: string; content?: { rendered?: string } }>;
  return items.map((it) => ({ title: plain(it.title?.rendered ?? ""), link: it.link ?? "", date: it.date ?? "", body: it.content?.rendered ?? "" }));
}

async function readSource(src: FeedSource, today: string): Promise<FeedCandidate[]> {
  const raw = src.format === "rss" ? parseRss(await get(src.url)) : parseWp(await get(src.url));
  const out: FeedCandidate[] = [];
  for (const it of raw) {
    if (!it.title || !it.link) continue;
    let text = plain(it.body);
    if (src.mustMatch && !src.mustMatch.test(`${it.title} ${text}`)) continue;
    // Regione Piemonte scrive lo stato all'inizio della descrizione («Aperto», «Esito»).
    const closedBySource = /\b(Esito|Chiuso|Scaduto)\b/.test(text.slice(0, 80));
    if (src.openDetail && !closedBySource) {
      await new Promise((r) => setTimeout(r, PAUSE_MS));
      try {
        text = plain((await get(it.link)).replace(/<(script|style|nav|header|footer)[\s\S]*?<\/\1>/gi, " ")).slice(0, 20_000);
      } catch {
        // Pagina non raggiungibile: si tiene la voce, senza scadenza.
      }
    }
    const allDeadlines = deadlinesInText(text);
    const packs = new Set<PackId>(src.packs);
    for (const [re, ps] of PACK_WORDS) if (re.test(`${it.title} ${text.slice(0, 3000)}`)) ps.forEach((p) => packs.add(p));
    out.push({
      externalCode: `FEED ${src.key} ${it.link}`.slice(0, 250),
      source: src,
      title: it.title.length > 220 ? `${it.title.slice(0, 217)}…` : it.title,
      summary: text.slice(0, 1500),
      link: it.link,
      publishedAt: it.date ? new Date(it.date).toISOString().slice(0, 10) : today,
      deadline: allDeadlines.find((d) => d >= today) ?? null,
      allDeadlines,
      closedBySource,
      packs: [...packs],
    });
  }
  return out;
}

/** Legge le fonti scelte; una fonte irraggiungibile non ferma le altre. */
export async function fetchFeeds(keys: string[], today: string): Promise<{ items: FeedCandidate[]; errors: string[] }> {
  const items: FeedCandidate[] = [];
  const errors: string[] = [];
  for (const src of FEED_SOURCES.filter((s) => keys.includes(s.key))) {
    try {
      items.push(...(await readSource(src, today)));
    } catch (e) {
      errors.push(`${src.label}: ${e instanceof Error ? e.message : "errore"}`);
    }
    await new Promise((r) => setTimeout(r, PAUSE_MS));
  }
  return { items, errors };
}

export function rejectFeed(c: FeedCandidate, f: FeedFilters, today: string): string | null {
  if (f.soloAperti && c.closedBySource) return "esito o chiuso";
  // Scadenze tutte passate: chiuso. Senza scadenza nel testo si tiene, da verificare.
  if (f.soloAperti && !c.deadline && c.allDeadlines.length && c.allDeadlines[c.allDeadlines.length - 1] < today) return "scaduto";
  // Senza scadenza nel testo e pubblicato da oltre sei mesi: quasi sempre un bando superato.
  const sixMonthsAgo = new Date(Date.parse(today) - 183 * 86_400_000).toISOString().slice(0, 10);
  if (f.soloAperti && !c.deadline && !c.allDeadlines.length && c.publishedAt < sixMonthsAgo) return "vecchio, senza scadenza";
  const text = `${c.title} ${c.summary}`;
  if (f.includi.length && !f.includi.some((w) => textHas(text, w))) return "parole chiave";
  if (f.escludi.some((w) => textHas(text, w))) return "parole escluse";
  return null;
}
