/**
 * Cerca Bandi — cumulabilità tra bandi
 *
 * Individua coppie di bandi che potrebbero finanziare lo stesso progetto coprendo voci
 * di spesa diverse, senza incorrere nel divieto di doppio finanziamento.
 *
 * ATTENZIONE — natura del risultato
 * La cumulabilità è una questione giuridica che si decide leggendo i testi ufficiali dei
 * due bandi e, per i fondi europei, i regolamenti applicabili. Questo modulo NON stabilisce
 * se due contributi siano cumulabili: segnala le combinazioni che vale la pena verificare
 * e quelle da scartare subito, elencando i motivi. La verifica finale resta umana.
 */

import type {
  Evaluation,
  ExpenseCategory,
  Opportunity,
  Profile,
} from "./types";
import { determineRole } from "./scoring";

export type CombinationLevel =
  /** Le spese non si sovrappongono e nessun vincolo noto lo impedisce: da verificare sui testi. */
  | "promettente"
  /** Possibile, ma con almeno un elemento che richiede attenzione particolare. */
  | "da-verificare"
  /** Da escludere: sovrapposizione di spese o divieto esplicito. */
  | "non-combinabile";

export interface CombinationFinding {
  opportunityIds: [string, string];
  level: CombinationLevel;
  /** Voci di spesa che ciascun bando coprirebbe, una volta separate. */
  splitProposal?: {
    [opportunityId: string]: ExpenseCategory[];
  };
  /** Voci di spesa contese: se non vuote, vanno assegnate a uno solo dei due. */
  overlap: ExpenseCategory[];
  reasons: string[];
  warnings: string[];
}

// ---------------------------------------------------------------------------

function intersect<T>(a: T[], b: T[]): T[] {
  return a.filter((x) => b.includes(x));
}

function difference<T>(a: T[], b: T[]): T[] {
  return a.filter((x) => !b.includes(x));
}

/** Due bandi hanno senso sullo stesso progetto solo se parlano di ambiti vicini. */
function sharesProjectContext(a: Opportunity, b: Opportunity): boolean {
  return intersect(a.packs, b.packs).length > 0;
}

/**
 * Le finestre temporali devono permettere di candidarsi a entrambi per lo stesso progetto.
 * Un bando già chiuso non può concorrere, salvo il caso in cui il contributo sia già stato
 * ottenuto: caso che va trattato a parte, non qui.
 */
function timingCompatible(a: Opportunity, b: Opportunity): boolean {
  const usable = (o: Opportunity) => o.status === "Aperto" || o.status === "In arrivo";
  return usable(a) && usable(b);
}

/**
 * Valuta una coppia di bandi per lo stesso progetto.
 * Restituisce `null` se i due bandi non hanno alcuna ragione di stare insieme.
 */
export function analyzePair(
  profile: Profile,
  a: Opportunity,
  b: Opportunity
): CombinationFinding | null {
  // Entrambi devono essere accessibili al profilo, in qualunque ruolo.
  if (determineRole(profile, a) === null || determineRole(profile, b) === null) return null;
  if (!sharesProjectContext(a, b)) return null;

  const reasons: string[] = [];
  const warnings: string[] = [];

  const catsA = a.expenseCategories ?? [];
  const catsB = b.expenseCategories ?? [];
  const overlap = intersect(catsA, catsB);
  const onlyA = difference(catsA, catsB);
  const onlyB = difference(catsB, catsA);

  let level: CombinationLevel = "promettente";

  // --- Esclusioni nette ----------------------------------------------------

  if (a.cumulabile === false || b.cumulabile === false) {
    const chi = a.cumulabile === false ? a.title : b.title;
    return {
      opportunityIds: [a.id, b.id],
      level: "non-combinabile",
      overlap,
      reasons: [`"${chi}" dichiara espressamente il contributo non cumulabile.`],
      warnings: [],
    };
  }

  if (!timingCompatible(a, b)) {
    return {
      opportunityIds: [a.id, b.id],
      level: "non-combinabile",
      overlap,
      reasons: ["Le finestre temporali non consentono di candidarsi a entrambi."],
      warnings: [],
    };
  }

  if (catsA.length === 0 || catsB.length === 0) {
    // Senza il dettaglio delle spese non si può escludere la sovrapposizione.
    return {
      opportunityIds: [a.id, b.id],
      level: "da-verificare",
      overlap,
      reasons: ["Le voci di spesa finanziate non sono state ancora estratte dai testi ufficiali."],
      warnings: ["Prima di procedere serve leggere quali spese ciascun bando ammette."],
    };
  }

  if (onlyA.length === 0 || onlyB.length === 0) {
    return {
      opportunityIds: [a.id, b.id],
      level: "non-combinabile",
      overlap,
      reasons: [
        "Le spese ammesse da un bando sono interamente contenute nell'altro: non resta una quota separabile, quindi si ricadrebbe nel doppio finanziamento.",
      ],
      warnings: [],
    };
  }

  // --- Sovrapposizioni parziali -------------------------------------------

  if (overlap.length > 0) {
    level = "da-verificare";
    reasons.push(
      `Entrambi finanziano ${overlap.length === 1 ? "la voce" : "le voci"} ${overlap.join(", ")}: ${overlap.length === 1 ? "questa spesa va imputata" : "queste spese vanno imputate"} a un solo bando.`
    );
  }

  reasons.push(
    `Le spese separabili sono ${onlyA.join(", ")} da un lato e ${onlyB.join(", ")} dall'altro.`
  );

  // --- Vincoli sui fondi europei ------------------------------------------

  if (a.fundingSource === "UE" && b.fundingSource === "UE") {
    level = "da-verificare";
    warnings.push(
      "Entrambi i contributi provengono da fondi europei: il divieto di doppio finanziamento è più stringente e va verificato sui regolamenti applicabili."
    );
  }

  // --- Cofinanziamento coperto da un altro bando ---------------------------

  const coversCofinancing = (x: Opportunity, y: Opportunity) =>
    (x.cofinanziamentoRichiestoPct ?? 0) > 0 && y.cofinanziamentoDaAltriFondi !== false;

  if (coversCofinancing(a, b) || coversCofinancing(b, a)) {
    warnings.push(
      "Va verificato se la quota di cofinanziamento richiesta da un bando possa essere coperta con il contributo dell'altro: molti bandi lo escludono."
    );
    if (level === "promettente") level = "da-verificare";
  }

  return {
    opportunityIds: [a.id, b.id],
    level,
    splitProposal: { [a.id]: onlyA, [b.id]: onlyB },
    overlap,
    reasons,
    warnings,
  };
}

/**
 * Cerca tutte le combinazioni utili tra i bandi rilevanti per un profilo.
 * Le combinazioni non praticabili vengono escluse dal risultato, salvo che si chieda
 * esplicitamente di vederle (`includeRejected`), utile per capire perché due bandi
 * apparentemente compatibili non lo siano.
 */
export function findCombinations(
  profile: Profile,
  opportunities: Opportunity[],
  options: { includeRejected?: boolean; evaluations?: Evaluation[] } = {}
): CombinationFinding[] {
  const findings: CombinationFinding[] = [];

  for (let i = 0; i < opportunities.length; i++) {
    for (let j = i + 1; j < opportunities.length; j++) {
      const finding = analyzePair(profile, opportunities[i], opportunities[j]);
      if (!finding) continue;
      if (finding.level === "non-combinabile" && !options.includeRejected) continue;
      findings.push(finding);
    }
  }

  // Prima le combinazioni più solide; a parità, quelle senza spese contese.
  const order: Record<CombinationLevel, number> = {
    promettente: 0,
    "da-verificare": 1,
    "non-combinabile": 2,
  };
  return findings.sort(
    (x, y) => order[x.level] - order[y.level] || x.overlap.length - y.overlap.length
  );
}

/** Riepilogo leggibile di una combinazione, per l'interfaccia o il report condivisibile. */
export function describeCombination(
  finding: CombinationFinding,
  opportunities: Opportunity[]
): string {
  const byId = (id: string) => opportunities.find((o) => o.id === id);
  const [a, b] = finding.opportunityIds.map(byId);
  if (!a || !b) return "";

  const header =
    finding.level === "promettente"
      ? "Combinazione promettente"
      : finding.level === "da-verificare"
        ? "Combinazione possibile, da verificare"
        : "Combinazione da escludere";

  const lines = [`${header}: "${a.title}" + "${b.title}"`];

  if (finding.splitProposal) {
    lines.push(
      `  · ${a.title}: ${(finding.splitProposal[a.id] || []).join(", ") || "—"}`,
      `  · ${b.title}: ${(finding.splitProposal[b.id] || []).join(", ") || "—"}`
    );
  }
  finding.reasons.forEach((r) => lines.push(`  · ${r}`));
  finding.warnings.forEach((w) => lines.push(`  ! ${w}`));
  if (finding.level !== "non-combinabile") {
    lines.push("  · Da confermare leggendo i testi ufficiali dei due bandi.");
  }

  return lines.join("\n");
}
