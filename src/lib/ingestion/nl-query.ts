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

export interface ParsedQuery {
  patch: Partial<AnacFilters>;
  /** Cosa è stato capito, una riga per aspetto, da mostrare all'utente. */
  understood: string[];
}

/** Temi: parole che li fanno riconoscere nella richiesta, radici cercate negli avvisi. */
const TOPICS: Array<{ label: string; trigger: RegExp; stems: string[] }> = [
  { label: "Edilizia scolastica", trigger: /scol|scuol|\basil|\bnid[io]\b|\blice[oi]\b|infanzia/, stems: ["scuol", "scolastic", "istituto comprensivo", "liceo", "asilo", "nido", "infanzia"] },
  { label: "Impianti sportivi", trigger: /sport|palestr|piscin|stadi|palazzett/, stems: ["sport", "palestr", "piscin", "stadio", "palazzett"] },
  { label: "Ponti e viabilità", trigger: /\bpont[ei]\b|viadott|strad|viabilit|rotator|galleri/, stems: ["ponte", "ponti", "viadott", "strad", "viabilit", "rotatori", "galleri"] },
  { label: "Rischio idrogeologico", trigger: /idrogeolog|dissest|\bfran|alluvion|argin|versant|torrent/, stems: ["idrogeolog", "dissest", "frana", "frane", "alluvion", "argin", "versant", "torrent"] },
  { label: "Efficienza energetica", trigger: /energ|fotovolt|efficient/, stems: ["energetic", "fotovoltaic", "efficientament", "pompe di calore", "rinnovabil"] },
  { label: "Rigenerazione urbana", trigger: /rigenera|piazz|spazi pubblic|arredo urbano|centro storico/, stems: ["rigenerazion", "piazza", "spazi pubblici", "arredo urbano", "centro storico", "riqualificazione urbana"] },
  { label: "Restauro e patrimonio", trigger: /restaur|patrimon|chies|castell|vincol|muse[oi]|beni cultural/, stems: ["restaur", "patrimonio", "chiesa", "castello", "vincolat", "museo", "beni culturali"] },
  { label: "Sanità", trigger: /sanit|ospedal|casa di comunit|case di comunit|\brsa\b|ambulator/, stems: ["ospedal", "sanitari", "casa di comunità", "case di comunità", "ambulatori", "rsa"] },
  { label: "Sicurezza sismica", trigger: /sismic/, stems: ["sismic"] },
  { label: "Acquedotti e fognature", trigger: /acquedott|fognat|fognar|depurat|idric/, stems: ["acquedott", "fognar", "fognat", "depurator", "idric"] },
  { label: "Cimiteri", trigger: /cimiter/, stems: ["cimiter"] },
  { label: "Piste ciclabili e mobilità", trigger: /ciclab|ciclopedon|mobilit/, stems: ["ciclabil", "ciclopedonal", "mobilità"] },
  { label: "Edilizia residenziale pubblica", trigger: /\berp\b|alloggi|residenzial|case popolari|housing/, stems: ["erp", "alloggi", "residenzial", "case popolari", "housing"] },
  { label: "Prevenzione incendi", trigger: /antincend|prevenzione incendi/, stems: ["antincend", "prevenzione incendi"] },
  { label: "Parcheggi", trigger: /parchegg/, stems: ["parchegg"] },
  { label: "Turismo", trigger: /turis|ricettiv/, stems: ["turis", "ricettiv"] },
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
