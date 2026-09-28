/**
 * Dalla richiesta scritta a parole («bandi per edilizia scolastica Lazio») ai filtri ANAC.
 *
 * Regole esplicite, non un modello di intelligenza artificiale: il risultato è sempre lo
 * stesso e si mostra all'utente prima di salvarlo. Ciò che non viene riconosciuto non
 * modifica i filtri.
 */

import { REGIONI, normalize, regioneBreve } from "@/lib/geo";
import data from "@/lib/geo/comuni-istat.json";
import type { AnacFilters } from "./anac";
import { SEDIA_PROGRAMMES, type SediaFilters } from "./sedia";

export interface ParsedQuery {
  patch: Partial<AnacFilters>;
  /** Cosa è stato capito, una riga per aspetto, da mostrare all'utente. */
  understood: string[];
}

/** Temi: parole che li fanno riconoscere nella richiesta, radici cercate negli avvisi. */
const TOPICS: Array<{ label: string; trigger: RegExp; stems: string[]; stemsEn: string[] }> = [
  { label: "Edilizia scolastica", trigger: /scol|scuol|\basil|\bnid[io]\b|\blice[oi]\b|infanzia/, stems: ["scuol", "scolastic", "istituto comprensivo", "liceo", "asilo", "nido", "infanzia"], stemsEn: ["school", "education", "pupil", "kindergarten"] },
  { label: "Impianti sportivi", trigger: /sport|palestr|piscin|stadi|palazzett/, stems: ["sport", "palestr", "piscin", "stadio", "palazzett"], stemsEn: ["sport", "physical activity"] },
  { label: "Ponti e viabilità", trigger: /\bpont[ei]\b|viadott|strad|viabilit|rotator|galleri/, stems: ["ponte", "ponti", "viadott", "strad", "viabilit", "rotatori", "galleri"], stemsEn: ["bridge", "road", "transport infrastructure"] },
  { label: "Rischio idrogeologico", trigger: /idrogeolog|dissest|\bfran|alluvion|argin|versant|torrent/, stems: ["idrogeolog", "dissest", "frana", "frane", "alluvion", "argin", "versant", "torrent"], stemsEn: ["flood", "landslide", "hydrogeolog", "climate adaptation", "resilien"] },
  { label: "Efficienza energetica", trigger: /energ|fotovolt|efficient/, stems: ["energetic", "fotovoltaic", "efficientament", "pompe di calore", "rinnovabil"], stemsEn: ["energy", "renewable", "efficien", "heating", "decarboni"] },
  { label: "Rigenerazione urbana", trigger: /rigenera|piazz|spazi pubblic|arredo urbano|centro storico/, stems: ["rigenerazion", "piazza", "spazi pubblici", "arredo urbano", "centro storico", "riqualificazione urbana"], stemsEn: ["urban", "cities", "regeneration", "public space", "bauhaus"] },
  { label: "Restauro e patrimonio", trigger: /restaur|patrimon|chies|castell|vincol|muse[oi]|beni cultural/, stems: ["restaur", "patrimonio", "chiesa", "castello", "vincolat", "museo", "beni culturali"], stemsEn: ["heritage", "cultur", "museum", "restoration"] },
  { label: "Sanità", trigger: /sanit|ospedal|casa di comunit|case di comunit|\brsa\b|ambulator/, stems: ["ospedal", "sanitari", "casa di comunità", "case di comunità", "ambulatori", "rsa"], stemsEn: ["health", "hospital", "care"] },
  { label: "Sicurezza sismica", trigger: /sismic/, stems: ["sismic"], stemsEn: ["seismic", "earthquake"] },
  { label: "Acquedotti e fognature", trigger: /acquedott|fognat|fognar|depurat|idric/, stems: ["acquedott", "fognar", "fognat", "depurator", "idric"], stemsEn: ["water", "wastewater", "sanitation"] },
  { label: "Cimiteri", trigger: /cimiter/, stems: ["cimiter"], stemsEn: [] },
  { label: "Piste ciclabili e mobilità", trigger: /ciclab|ciclopedon|mobilit/, stems: ["ciclabil", "ciclopedonal", "mobilità"], stemsEn: ["mobility", "cycling", "transport"] },
  { label: "Edilizia residenziale pubblica", trigger: /\berp\b|alloggi|residenzial|case popolari|housing/, stems: ["erp", "alloggi", "residenzial", "case popolari", "housing"], stemsEn: ["housing", "affordable"] },
  { label: "Prevenzione incendi", trigger: /antincend|prevenzione incendi/, stems: ["antincend", "prevenzione incendi"], stemsEn: ["wildfire", "fire"] },
  { label: "Parcheggi", trigger: /parchegg/, stems: ["parchegg"], stemsEn: [] },
  { label: "Cittadinanza e partecipazione", trigger: /cittadin|partecipaz|democra|giovan|inclusion|uguaglianz|diritti/, stems: ["cittadin", "partecipaz", "democra", "giovan", "inclusion"], stemsEn: ["citizen", "democra", "youth", "inclusion", "equality", "civil society"] },
  { label: "Ambiente e biodiversità", trigger: /ambient|biodivers|natura|clima|circolar/, stems: ["ambient", "biodivers", "natura", "clima"], stemsEn: ["environment", "biodivers", "nature", "climate", "circular"] },
  { label: "Digitale", trigger: /digital|intelligenza artificiale|\bdati\b|cyber/, stems: ["digital", "intelligenza artificiale", "dati"], stemsEn: ["digital", "artificial intelligence", "data", "cyber"] },
  { label: "Turismo", trigger: /turis|ricettiv/, stems: ["turis", "ricettiv"], stemsEn: ["touris"] },
];

/** Tipi di prestazione: parole della richiesta → famiglie CPV. */
const SERVICES: Array<{ label: string; trigger: RegExp; cpv: string[] }> = [
  { label: "Progettazione", trigger: /progett|pfte|fattibilit/, cpv: ["712", "713"] },
  { label: "Architettura", trigger: /architett/, cpv: ["712"] },
  { label: "Ingegneria", trigger: /ingegner/, cpv: ["713"] },
  { label: "Direzione lavori, collaudi, sicurezza", trigger: /direzione lavori|collaud|coordinamento (della )?sicurezza|\bcs[pe]\b|verifica (del )?progett/, cpv: ["713"] },
  { label: "Rilievi e indagini", trigger: /rilev|rilie|topograf|indagini? (geolog|geotecn|struttural)|(?<!idro)geolog/, cpv: ["713"] },
  { label: "Urbanistica e paesaggio", trigger: /urbanistic|piano regolatore|\bprg\b|\bpug\b|paesaggi/, cpv: ["714"] },
  { label: "Lavori", trigger: /(?<!direzione (dei )?)\blavori\b|costruzion|realizzazione (di )?opere|appalt[oi] di lavori/, cpv: ["452", "453", "454"] },
];

const PROVINCE = data.province as Record<string, { nome: string; regione: string }>;

/** Nomi alternativi comuni delle regioni. */
const REGION_ALIASES: Record<string, string> = {
  "EMILIA ROMAGNA": "Emilia-Romagna",
  EMILIA: "Emilia-Romagna",
  ROMAGNA: "Emilia-Romagna",
  FRIULI: "Friuli-Venezia Giulia",
  "FRIULI VENEZIA GIULIA": "Friuli-Venezia Giulia",
  TRENTINO: "Trentino-Alto Adige",
  "ALTO ADIGE": "Trentino-Alto Adige",
  "VALLE D AOSTA": "Valle d'Aosta",
  "VAL D AOSTA": "Valle d'Aosta",
};

function parseAmount(raw: string): number | null {
  const m = raw.match(/(\d+(?:[.,]\d+)*)\s*(mila|k|mln|milion[ei]|mld)?/i);
  if (!m) return null;
  const digits = m[1];
  // «100.000» e «1.500.000» usano il punto per le migliaia; «1,5» la virgola per i decimali.
  let n = /^\d{1,3}(\.\d{3})+$/.test(digits) ? Number(digits.replace(/\./g, "")) : Number(digits.replace(/\./g, "").replace(",", "."));
  const unit = m[2]?.toLowerCase();
  if (unit === "mila" || unit === "k") n *= 1_000;
  else if (unit === "mln" || unit?.startsWith("milion")) n *= 1_000_000;
  else if (unit === "mld") n *= 1_000_000_000;
  return Number.isFinite(n) ? n : null;
}

export function parseQuery(text: string): ParsedQuery {
  const lower = text.toLowerCase();
  const upper = ` ${normalize(text)} `;
  const patch: Partial<AnacFilters> = { ricerca: text.trim() };
  const understood: string[] = [];

  // Regioni: nomi, nomi alternativi, province (es. «Roma» → Lazio).
  const regioni = new Set<string>();
  for (const r of REGIONI) for (const part of r.split("/")) if (upper.includes(` ${normalize(part)} `)) regioni.add(regioneBreve(r));
  for (const [alias, r] of Object.entries(REGION_ALIASES)) if (upper.includes(` ${alias} `)) regioni.add(r);
  const viaProvincia: string[] = [];
  for (const p of Object.values(PROVINCE)) {
    for (const part of p.nome.split("/")) {
      // Province solo se scritte con la maiuscola: «Prato» è una provincia, «prato» no.
      const escaped = part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const named = new RegExp(`(^|[^\\p{L}])${escaped}($|[^\\p{L}])`, "u").test(text);
      if (part.length > 3 && named && !regioni.has(regioneBreve(p.regione))) {
        regioni.add(regioneBreve(p.regione));
        viaProvincia.push(`${part} → ${regioneBreve(p.regione)}`);
      }
    }
  }
  if (/tutta italia|in italia|nazional/.test(lower) && regioni.size === 0) {
    patch.regioni = [];
    understood.push("Territorio: tutta Italia");
  } else if (regioni.size) {
    patch.regioni = [...regioni];
    understood.push(`Regioni: ${[...regioni].join(", ")}${viaProvincia.length ? ` (da ${viaProvincia.join(", ")})` : ""}`);
  }

  // Temi → parole chiave da cercare negli avvisi.
  const topics = TOPICS.filter((t) => t.trigger.test(lower));
  if (topics.length) {
    patch.includi = [...new Set(topics.flatMap((t) => t.stems))];
    understood.push(`Temi: ${topics.map((t) => t.label).join(", ")}. L'avviso deve contenere almeno una di queste parole: ${patch.includi.join(", ")}`);
  }

  // Tipo di prestazione → CPV.
  const services = SERVICES.filter((s) => s.trigger.test(lower));
  if (services.length) {
    patch.cpv = [...new Set(services.flatMap((s) => s.cpv))];
    understood.push(`Tipo di servizio: ${services.map((s) => s.label).join(", ")} (CPV ${patch.cpv.join(", ")})`);
  }

  // Importi.
  const min = lower.match(/(?:sopra|oltre|superiore a|superiori a|più di|almeno|a partire da|da)\s*(?:i\s*|€\s*)?(\d[\d.,]*\s*(?:mila|k|mln|milion[ei]|mld)?)/);
  const max = lower.match(/(?:sotto|fino a|inferiore a|inferiori a|meno di|entro|non oltre|massimo)\s*(?:i\s*|€\s*)?(\d[\d.,]*\s*(?:mila|k|mln|milion[ei]|mld)?)/);
  const amountMin = min ? parseAmount(min[1]) : null;
  const amountMax = max ? parseAmount(max[1]) : null;
  if (amountMin !== null) patch.importoMin = amountMin;
  if (amountMax !== null) patch.importoMax = amountMax;
  if (amountMin !== null || amountMax !== null) {
    const fmt = (n: number) => `${n.toLocaleString("it-IT")} €`;
    understood.push(`Importo: ${amountMin !== null ? `da ${fmt(amountMin)}` : ""}${amountMin !== null && amountMax !== null ? " " : ""}${amountMax !== null ? `fino a ${fmt(amountMax)}` : ""}`);
  }

  // Tipo di avviso.
  if (/manifestazion|indagin[ei] di mercato|avvisi esplorativ/.test(lower) && !/\bgare?\b|bandi di gara/.test(lower)) {
    patch.tipologie = ["INDAGINI_DI_MERCATO_SOTTO_SOGLIA"];
    understood.push("Tipo di avviso: solo indagini di mercato e manifestazioni di interesse");
  } else if (/solo (le )?gare|solo bandi di gara/.test(lower)) {
    patch.tipologie = ["BANDI"];
    understood.push("Tipo di avviso: solo bandi di gara");
  }

  // Esclusioni: «tranne X», «escluso X», «senza X», fino alla virgola o a «e».
  const escludi = [...lower.matchAll(/(?:tranne|escluso|esclusi|escludendo|senza|non)\s+(?:la |il |lo |le |i |gli |l')?([a-zà-ù' ]{3,40}?)(?=,|\.|;| e |$)/g)].map((m) => m[1].trim());
  if (escludi.length) {
    patch.escludi = escludi;
    understood.push(`Escludi gli avvisi che contengono: ${escludi.join(", ")}`);
  }

  // Periodo e scadenze.
  const days = lower.match(/ultim[io]\s+(\d+)\s+giorn/);
  if (days) patch.giorniIndietro = Math.min(60, Math.max(1, Number(days[1])));
  else if (/ultim[ao] mese/.test(lower)) patch.giorniIndietro = 30;
  else if (/ultima settimana/.test(lower)) patch.giorniIndietro = 7;
  if (patch.giorniIndietro) understood.push(`Periodo: ultimi ${patch.giorniIndietro} giorni`);
  if (/anche (scadut|chius)/.test(lower)) {
    patch.soloAperti = false;
    understood.push("Anche avvisi già scaduti");
  }

  if (understood.length === 0) understood.push("Nessun filtro riconosciuto: prova a indicare una regione, un tema o un tipo di servizio.");
  return { patch, understood };
}

// ---------------------------------------------------------------------------
// Funding & Tenders (bandi europei, in inglese)
// ---------------------------------------------------------------------------


/** Parole che indicano un programma europeo, con il suo codice. */
const PROGRAMME_WORDS: Array<[RegExp, string]> = [
  [/horizon|ricerca e innovazione/, "43108390"],
  [/\blife\b/, "43252405"],
  [/digital europe/, "43152860"],
  [/connecting europe|\bcef\b/, "43251567"],
  [/\bcerv\b|cittadini,? uguaglianza/, "43251589"],
  [/europa creativa|creative europe/, "43251814"],
  [/erasmus/, "43353764"],
  [/corpo europeo di solidariet|solidarity corps/, "43254037"],
  [/fondo sociale|\bfse\b|\besf\b/, "43254019"],
  [/transizione giusta|just transition/, "44773066"],
  [/innovation fund/, "43089234"],
  [/feampa|pesca|acquacoltura/, "43392145"],
];

export interface ParsedSediaQuery {
  patch: Partial<SediaFilters>;
  understood: string[];
}

export function parseSediaQuery(text: string): ParsedSediaQuery {
  const lower = text.toLowerCase();
  const patch: Partial<SediaFilters> = { ricerca: text.trim() };
  const understood: string[] = [];

  const programmes = [...new Set(PROGRAMME_WORDS.filter(([re]) => re.test(lower)).map(([, code]) => code))];
  if (programmes.length) {
    patch.programmi = programmes;
    understood.push(`Programmi: ${programmes.map((c) => SEDIA_PROGRAMMES.find((p) => p.code === c)?.label ?? c).join(", ")}`);
  }

  const topics = TOPICS.filter((t) => t.trigger.test(lower) && t.stemsEn.length);
  if (topics.length) {
    patch.includi = [...new Set(topics.flatMap((t) => t.stemsEn))];
    understood.push(`Temi: ${topics.map((t) => t.label).join(", ")}. Il bando (in inglese) deve contenere almeno una di queste parole: ${patch.includi.join(", ")}`);
  }

  const min = lower.match(/(?:sopra|oltre|superiore a|almeno|più di)\s*(?:i\s*|€\s*)?(\d[\d.,]*\s*(?:mila|k|mln|milion[ei])?)/);
  const budget = min ? parseAmount(min[1]) : null;
  if (budget !== null) {
    patch.budgetMin = budget;
    understood.push(`Budget del bando: almeno ${budget.toLocaleString("it-IT")} €`);
  }
  if (/solo (quelli |i bandi )?aperti|già aperti/.test(lower)) {
    patch.inArrivo = false;
    understood.push("Solo bandi già aperti (esclusi quelli in arrivo)");
  }
  if (/cascata|fstp|terze parti/.test(lower)) {
    patch.cascata = true;
    understood.push("Anche i bandi a cascata (gestiti da progetti già finanziati)");
  }
  const escludi = [...lower.matchAll(/(?:tranne|escluso|esclusi|senza)\s+([a-zà-ù' ]{3,40}?)(?=,|\.|;| e |$)/g)].map((m) => m[1].trim());
  if (escludi.length) {
    patch.escludi = escludi;
    understood.push(`Escludi i bandi che contengono: ${escludi.join(", ")} (i testi sono in inglese: meglio parole inglesi)`);
  }

  if (understood.length === 0) understood.push("Nessun filtro riconosciuto: prova a indicare un programma (es. LIFE, Erasmus) o un tema (es. patrimonio, energia, cittadinanza).");
  return { patch, understood };
}
