/**
 * Da un nome di Comune o di provincia alla regione, con l'elenco ufficiale ISTAT.
 * Serve ai lettori delle fonti, che spesso indicano solo il Comune.
 */

import data from "./comuni-istat.json";

interface Provincia {
  nome: string;
  regione: string;
}

const PROVINCE = data.province as Record<string, Provincia>;
const COMUNI = data.comuni as Record<string, string>;
export const REGIONI: string[] = data.regioni;

export const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9/ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Nomi brevi delle regioni (es. «Trentino-Alto Adige/Südtirol» → «Trentino-Alto Adige»). */
export const regioneBreve = (r: string) => r.split("/")[0];

const PROVINCE_BY_NAME = new Map<string, string>();
for (const [sigla, p] of Object.entries(PROVINCE)) {
  PROVINCE_BY_NAME.set(normalize(p.nome), sigla);
  for (const part of p.nome.split("/")) PROVINCE_BY_NAME.set(normalize(part), sigla);
}
const REGIONI_BY_NAME = new Map<string, string>();
for (const r of REGIONI) {
  REGIONI_BY_NAME.set(normalize(r), r);
  for (const part of r.split("/")) REGIONI_BY_NAME.set(normalize(part), r);
}

export interface Luogo {
  comune?: string;
  sigla?: string;
  provincia?: string;
  /** Regioni possibili: più di una solo se il Comune è omonimo e nient'altro aiuta. */
  regioni: string[];
  incerto: boolean;
}

/**
 * Ricava il luogo da un nome di Comune e da un'indicazione più ampia (provincia, regione
 * o «ITALIA»), come quelle degli avvisi ANAC.
 */
export function resolveLuogo(comune?: string | null, area?: string | null): Luogo {
  const c = comune ? normalize(comune) : "";
  const a = area ? normalize(area) : "";

  const siglaArea = a ? PROVINCE_BY_NAME.get(a) : undefined;
  const regioneArea = a ? REGIONI_BY_NAME.get(a) : undefined;
  const sigleComune = c && COMUNI[c] ? COMUNI[c].split(",") : [];

  let sigla: string | undefined;
  if (sigleComune.length === 1) sigla = sigleComune[0];
  else if (sigleComune.length > 1) {
    // Comune omonimo: decide la provincia o la regione indicata nell'avviso, se c'è.
    sigla =
      sigleComune.find((s) => s === siglaArea) ??
      (regioneArea ? sigleComune.find((s) => PROVINCE[s].regione === regioneArea) : undefined);
  } else if (siglaArea) sigla = siglaArea;

  if (sigla) {
    const p = PROVINCE[sigla];
    return { comune: comune ?? undefined, sigla, provincia: p.nome, regioni: [p.regione], incerto: false };
  }
  if (sigleComune.length > 1) {
    const regioni = [...new Set(sigleComune.map((s) => PROVINCE[s].regione))];
    return { comune: comune ?? undefined, regioni, incerto: true };
  }
  if (regioneArea) return { comune: comune ?? undefined, regioni: [regioneArea], incerto: !c };
  return { comune: comune ?? undefined, regioni: [], incerto: true };
}
