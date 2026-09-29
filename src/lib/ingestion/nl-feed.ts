/**
 * Ricerca a parole per Regione Piemonte, fondazioni e GSE: quali fonti seguire e quali
 * temi cercare nei testi (in italiano). Stesso principio della ricerca ANAC: regole
 * esplicite, risultato mostrato prima del salvataggio.
 */

import { parseQuery } from "./nl-query";
import { FEED_SOURCES, type FeedFilters } from "./feeds";

const SOURCE_WORDS: Array<[RegExp, string[]]> = [
  [/\bfondazion/, ["csp", "crt", "consud"]],
  [/san paolo|compagnia/, ["csp"]],
  [/\bcrt\b/, ["crt"]],
  [/con il sud|\bsud\b|mezzogiorno/, ["consud"]],
  [/regione piemonte|\bpiemonte\b/, ["piemonte"]],
  [/\bgse\b|energi|rinnovabil|comunit[aà] energetic/, ["gse"]],
];

export function parseFeedQuery(text: string): { patch: Partial<FeedFilters>; understood: string[] } {
  const lower = text.toLowerCase();
  const patch: Partial<FeedFilters> = { ricerca: text.trim() };
  const understood: string[] = [];

  const fonti = [...new Set(SOURCE_WORDS.filter(([re]) => re.test(lower)).flatMap(([, keys]) => keys))];
  if (fonti.length) {
    patch.fonti = fonti;
    understood.push(`Fonti: ${fonti.map((k) => FEED_SOURCES.find((s) => s.key === k)?.label ?? k).join(", ")}`);
  }

  // Temi ed esclusioni: gli stessi riconosciuti nella ricerca ANAC (testi in italiano).
  const base = parseQuery(text);
  if (base.patch.includi?.length) {
    patch.includi = base.patch.includi;
    understood.push(...base.understood.filter((u) => u.startsWith("Temi")));
  }
  if (base.patch.escludi?.length) {
    patch.escludi = base.patch.escludi;
    understood.push(...base.understood.filter((u) => u.startsWith("Escludi")));
  }
  if (/anche (scadut|chius)/.test(lower)) {
    patch.soloAperti = false;
    understood.push("Anche bandi scaduti ed esiti");
  }

  if (understood.length === 0) understood.push("Nessun filtro riconosciuto: prova a indicare una fonte (es. fondazioni, Regione Piemonte, GSE) o un tema.");
  return { patch, understood };
}
