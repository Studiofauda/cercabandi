/**
 * Cerca Bandi — motore di valutazione
 *
 * Principi (requisiti v3):
 * - I pesi non sono fissi: si proporzionano ai requisiti del singolo bando.
 * - Un dato incerto non blocca il punteggio: produce un intervallo, non un errore.
 * - La replicabilità su più committenti agisce da moltiplicatore.
 * - Se un profilo non è ammissibile ma lavora per chi lo è, il bando resta rilevante
 *   come incarico tecnico invece di essere scartato.
 * - L'affidabilità della fonte non influisce sul punteggio (solo sull'ordinamento).
 */

import type {
  BeneficiaryRole,
  Evaluation,
  Opportunity,
  PackId,
  ParamStatus,
  ParamValue,
  Profile,
  ScoreBreakdown,
  TechnicalSkill,
  UncertainParam,
} from "./types";
import { TECHNICAL_SKILLS } from "./types";

/** Soglia sopra la quale un nuovo bando viene segnalato nel digest. */
export const DIGEST_THRESHOLD = 70;

/** Moltiplicatore applicato ai bandi replicabili, per i profili che lavorano su commessa. */
const REPLICABILITY_MULTIPLIER = 1.15;

/**
 * Riduzione applicata agli incarichi tecnici su bandi che richiedono cofinanziamento.
 * Non è una penalizzazione del ruolo: il cofinanziamento resta a carico del committente,
 * ma la sua necessità rende l'incarico meno certo, perché dipende dalla capacità
 * dell'amministrazione di coprire la propria quota.
 */
const TECHNICAL_COFINANCING_FACTOR = 0.8;

/**
 * Quanto allarga l'intervallo un dato stimato, rispetto a un dato mancante o a un'ipotesi
 * (che valgono 1). Un dato stimato è più informativo di uno assente, ma non è verificato.
 */
const ESTIMATED_UNCERTAINTY_FACTOR = 0.5;

/**
 * Punteggio territoriale di una gara fuori dalle regioni in cui il profilo opera: si può
 * partecipare, ma è più onerosa (trasferte, conoscenza del territorio, sopralluoghi).
 */
const PROCUREMENT_OUTSIDE_TERRITORY_SCORE = 60;

/** Ampiezza dell'intervallo (in punti) generata da un criterio del tutto incerto, a peso pieno. */
const UNCERTAINTY_SPREAD = 40;

// ---------------------------------------------------------------------------
// Dati incerti
// ---------------------------------------------------------------------------

/** Etichette leggibili dei campi, per indicare all'utente cosa compilare o verificare. */
const FIELD_LABELS: Record<string, string> = {
  regione: "Regione",
  abitanti: "Abitanti",
  capacitaCofinanziamento: "Capacità di cofinanziamento",
  rupDisponibile: "RUP interno",
  personaleTecnico: "Personale tecnico",
  competenze: "Competenze tecniche",
  regioniOperative: "Regioni in cui opera",
  preavvisoMinimoGiorni: "Preavviso minimo",
  contributoMax: "Importo del contributo",
  deadline: "Scadenza",
};

/** Stato di incertezza di un parametro del profilo; `null` se il dato è verificato. */
function paramStatus(p: ParamValue<unknown> | undefined): ParamStatus | null {
  if (!p || p.value === null || p.value === undefined) return "mancante";
  if (p.confidence === "stimato" || p.confidence === "ipotesi") return p.confidence;
  return null;
}

function uncertain(
  criterion: string,
  key: string,
  status: ParamStatus | null,
  subject: UncertainParam["subject"] = "profilo"
): UncertainParam[] {
  return status ? [{ key, label: FIELD_LABELS[key] ?? key, criterion, subject, status }] : [];
}

function uncertaintyFactor(status: ParamStatus): number {
  return status === "stimato" ? ESTIMATED_UNCERTAINTY_FACTOR : 1;
}

// ---------------------------------------------------------------------------
// Ruolo del profilo rispetto al bando
// ---------------------------------------------------------------------------

/**
 * Stabilisce con quale ruolo il profilo può accedere al bando.
 * `null` significa che il bando non lo riguarda in alcun modo.
 */
export function determineRole(profile: Profile, opportunity: Opportunity): BeneficiaryRole | null {
  if (opportunity.eligibleSubjectTypes.includes(profile.subjectType)) {
    return "beneficiario-diretto";
  }

  // "Bando per il Comune, ma ci lavoreremmo noi": un'impresa che opera per enti pubblici
  // vede il bando come possibile incarico tecnico (requisiti v3, punto aperto 2).
  const lavoraPerEnti = profile.interviewAnswers?.lavoraPerEnti === true;
  if (
    profile.subjectType === "impresa" &&
    lavoraPerEnti &&
    opportunity.eligibleSubjectTypes.includes("ente-pubblico")
  ) {
    return "incarico-tecnico";
  }

  return null;
}

// ---------------------------------------------------------------------------
// Pesi dinamici
// ---------------------------------------------------------------------------

interface Weights {
  tema: number;
  territorio: number;
  capacitaEconomica: number;
  capacitaOrganizzativa: number;
  tempistiche: number;
  requisitiDimensionali: number;
  competenze: number;
}

function hasDemographicThresholds(opportunity: Opportunity): boolean {
  return opportunity.abitantiMin !== undefined || opportunity.abitantiMax !== undefined;
}

function hasRequiredSkills(opportunity: Opportunity): boolean {
  return (opportunity.competenzeRichieste?.length ?? 0) > 0;
}

/**
 * I pesi si adattano al bando: se un bando non chiede cofinanziamento, la capacità
 * economica non deve pesare; se la scadenza è vicina, le tempistiche pesano di più;
 * le soglie demografiche e le competenze pesano solo sui bandi che le prevedono.
 * I valori vengono poi normalizzati, così la somma resta sempre 1.
 */
export function computeWeights(opportunity: Opportunity, daysLeft: number | null): Weights {
  const w: Weights = {
    tema: 3,
    territorio: 2,
    capacitaEconomica: 1,
    capacitaOrganizzativa: 1,
    tempistiche: 1,
    requisitiDimensionali: hasDemographicThresholds(opportunity) ? 2 : 0,
    competenze: hasRequiredSkills(opportunity) ? 2 : 0,
  };

  if (opportunity.cofinanziamentoRichiestoPct && opportunity.cofinanziamentoRichiestoPct > 0) {
    w.capacitaEconomica += 2;
  }
  if (opportunity.budgetTotale && opportunity.budgetTotale > 1_000_000) {
    w.capacitaOrganizzativa += 1;
    w.capacitaEconomica += 1;
  }
  if ((opportunity.level === "Regionale" || opportunity.level === "Locale") && !isProcurement(opportunity)) {
    // Sui contributi locali la coerenza territoriale è spesso un requisito, non una
    // preferenza. Nelle gare non lo è: il peso resta quello base.
    w.territorio += 2;
  }
  if (daysLeft !== null && daysLeft <= 30) {
    w.tempistiche += 2;
  }

  const total = Object.values(w).reduce((a, b) => a + b, 0);
  (Object.keys(w) as Array<keyof Weights>).forEach((k) => {
    w[k] = w[k] / total;
  });
  return w;
}

// ---------------------------------------------------------------------------
// Criteri
// ---------------------------------------------------------------------------

function overlapScore(a: PackId[], b: PackId[]): number {
  if (!a.length || !b.length) return 0;
  const shared = a.filter((p) => b.includes(p)).length;
  return Math.min(100, (shared / Math.min(a.length, b.length)) * 100);
}

function scoreTema(profile: Profile, opportunity: Opportunity): ScoreBreakdown {
  const packScore = overlapScore(profile.packs, opportunity.packs);
  const themeHit = profile.themes.some((t) =>
    (opportunity.theme || "").toLowerCase().includes(t.toLowerCase().slice(0, 12))
  );
  const score = Math.min(100, packScore + (themeHit ? 15 : 0));
  return {
    criterion: "Coerenza tematica",
    weight: 0,
    score,
    note: packScore === 0 ? "Nessun ambito in comune" : `Ambiti condivisi con il profilo`,
  };
}

function scoreTerritorio(profile: Profile, opportunity: Opportunity): ScoreBreakdown {
  const criterion = "Coerenza territoriale";
  const regione = profile.params.regione?.value as string | undefined;
  const territory = (opportunity.territory || "").toLowerCase();

  if (opportunity.level === "Europeo" || opportunity.level === "Nazionale") {
    return { criterion, weight: 0, score: 100, note: "Ambito non vincolato al territorio" };
  }
  if (isProcurement(opportunity)) return scoreTerritorioGara(profile, territory);
  if (!regione) {
    return {
      criterion,
      weight: 0,
      score: 50,
      note: "Regione del profilo non indicata",
      uncertainParams: uncertain(criterion, "regione", "mancante"),
    };
  }
  const match = territory.includes(regione.toLowerCase());
  return {
    criterion,
    weight: 0,
    score: match ? 100 : 0,
    note: match ? `Territorio compatibile (${regione})` : `Bando riservato ad altro territorio`,
    uncertainParams: uncertain(criterion, "regione", paramStatus(profile.params.regione)),
  };
}

/** Gare d'appalto e qualificazioni: il territorio orienta, non esclude. */
function isProcurement(opportunity: Opportunity): boolean {
  return opportunity.kind === "gara" || opportunity.kind === "qualificazione";
}

/**
 * In una gara può partecipare un operatore di qualsiasi regione: il territorio misura
 * quanto la gara è vicina a dove il profilo lavora, e non blocca mai. Riferimento: le
 * regioni in cui il profilo opera; se non indicate, la sua regione.
 */
function scoreTerritorioGara(profile: Profile, territory: string): ScoreBreakdown {
  const criterion = "Coerenza territoriale";
  const operative = profile.params.regioniOperative;
  const list = (operative?.value as string[] | null | undefined)?.filter(Boolean);
  const regione = profile.params.regione?.value as string | undefined;
  const reference = list?.length ? list : regione ? [regione] : [];
  const key = list?.length ? "regioniOperative" : "regione";

  if (!reference.length) {
    return {
      criterion,
      weight: 0,
      score: 50,
      note: "Regioni in cui il profilo opera non indicate",
      nonBlocking: true,
      uncertainParams: uncertain(criterion, "regioniOperative", "mancante"),
    };
  }
  const match = reference.find((r) => territory.includes(r.toLowerCase()));
  return {
    criterion,
    weight: 0,
    score: match ? 100 : PROCUREMENT_OUTSIDE_TERRITORY_SCORE,
    note: match
      ? `Gara in una regione in cui il profilo opera (${match})`
      : "Gara fuori dalle regioni in cui il profilo opera: partecipazione possibile, ma più onerosa",
    nonBlocking: true,
    uncertainParams: uncertain(criterion, key, paramStatus(key === "regioniOperative" ? operative : profile.params.regione)),
  };
}

function scoreCapacitaEconomica(profile: Profile, opportunity: Opportunity): ScoreBreakdown {
  const criterion = "Capacità economica";
  const pct = opportunity.cofinanziamentoRichiestoPct ?? 0;
  if (pct === 0) {
    return { criterion, weight: 0, score: 100, note: "Nessun cofinanziamento richiesto" };
  }
  const budget = opportunity.contributoMax ?? opportunity.budgetTotale ?? 0;
  const richiesto = (budget * pct) / 100;
  const disponibile = profile.params.capacitaCofinanziamento?.value as number | undefined;

  if (disponibile === undefined || disponibile === null) {
    return {
      criterion,
      weight: 0,
      score: 50,
      note: "Capacità di cofinanziamento non indicata",
      uncertainParams: uncertain(criterion, "capacitaCofinanziamento", "mancante"),
    };
  }
  if (richiesto === 0) {
    return {
      criterion,
      weight: 0,
      score: 75,
      note: "Importo del bando non ancora noto",
      uncertainParams: uncertain(criterion, "contributoMax", "mancante", "bando"),
    };
  }
  const ratio = disponibile / richiesto;
  const score = Math.max(0, Math.min(100, ratio * 100));
  return {
    criterion,
    weight: 0,
    score,
    note: ratio >= 1 ? "Cofinanziamento sostenibile" : "Cofinanziamento richiesto superiore alla capacità dichiarata",
    uncertainParams: uncertain(criterion, "capacitaCofinanziamento", paramStatus(profile.params.capacitaCofinanziamento)),
  };
}

function scoreCapacitaOrganizzativa(profile: Profile): ScoreBreakdown {
  const criterion = "Capacità organizzativa";
  const rup = profile.params.rupDisponibile?.value;
  const personale = profile.params.personaleTecnico?.value as number | undefined;

  if (profile.subjectType === "ente-pubblico") {
    const rupUncertain = uncertain(criterion, "rupDisponibile", paramStatus(profile.params.rupDisponibile));
    if (rup === true) return { criterion, weight: 0, score: 100, note: "RUP interno disponibile", uncertainParams: rupUncertain };
    if (rup === false) return { criterion, weight: 0, score: 40, note: "Nessun RUP interno: serve supporto esterno", uncertainParams: rupUncertain };
    return { criterion, weight: 0, score: 60, note: "Disponibilità del RUP non indicata", uncertainParams: rupUncertain };
  }
  const personaleUncertain = uncertain(criterion, "personaleTecnico", paramStatus(profile.params.personaleTecnico));
  if (personale !== undefined && personale !== null) {
    return { criterion, weight: 0, score: Math.min(100, personale * 20), note: `${personale} risorse tecniche dichiarate`, uncertainParams: personaleUncertain };
  }
  return { criterion, weight: 0, score: 70, note: "Struttura organizzativa non dettagliata", uncertainParams: personaleUncertain };
}

function scoreTempistiche(profile: Profile, daysLeft: number | null): ScoreBreakdown {
  const criterion = "Tempistiche";
  if (daysLeft === null) {
    return {
      criterion,
      weight: 0,
      score: 60,
      note: "Scadenza non ancora nota",
      uncertainParams: uncertain(criterion, "deadline", "mancante", "bando"),
    };
  }
  const preavviso = profile.params.preavvisoMinimoGiorni;
  const minimo = (preavviso?.value as number | undefined) ?? 20;
  if (daysLeft < 0) return { criterion, weight: 0, score: 0, note: "Termine superato" };

  // Se il preavviso non è indicato si usa il valore di default, senza allargare l'intervallo;
  // se è indicato ma stimato, l'incertezza viene conteggiata.
  const preavvisoUncertain =
    preavviso?.value !== undefined && preavviso?.value !== null
      ? uncertain(criterion, "preavvisoMinimoGiorni", paramStatus(preavviso))
      : [];
  if (daysLeft < minimo) {
    return { criterion, weight: 0, score: 20, note: `Solo ${daysLeft} giorni: sotto il preavviso minimo di ${minimo}`, uncertainParams: preavvisoUncertain };
  }
  return { criterion, weight: 0, score: 100, note: `${daysLeft} giorni disponibili`, uncertainParams: preavvisoUncertain };
}

function describeThresholds(opportunity: Opportunity): string {
  const fmt = (n: number) => n.toLocaleString("it-IT");
  const { abitantiMin: min, abitantiMax: max } = opportunity;
  if (min !== undefined && max !== undefined) return `tra ${fmt(min)} e ${fmt(max)} abitanti`;
  if (max !== undefined) return `fino a ${fmt(max)} abitanti`;
  return `almeno ${fmt(min!)} abitanti`;
}

/**
 * Soglie demografiche del bando. Sono requisiti di ammissibilità: fuori soglia il bando
 * è bloccato (NO-GO) indipendentemente dal peso del criterio.
 */
function scoreRequisitiDimensionali(profile: Profile, opportunity: Opportunity): ScoreBreakdown {
  const criterion = "Requisiti dimensionali";
  const soglia = describeThresholds(opportunity);
  const abitanti = profile.params.abitanti?.value as number | null | undefined;

  if (abitanti === undefined || abitanti === null) {
    return {
      criterion,
      weight: 0,
      score: 50,
      note: `Abitanti non indicati (il bando richiede ${soglia})`,
      eligibility: true,
      uncertainParams: uncertain(criterion, "abitanti", "mancante"),
    };
  }
  const { abitantiMin: min, abitantiMax: max } = opportunity;
  const entro = (min === undefined || abitanti >= min) && (max === undefined || abitanti <= max);
  const n = abitanti.toLocaleString("it-IT");
  return {
    criterion,
    weight: 0,
    score: entro ? 100 : 0,
    note: entro ? `${n} abitanti: entro la soglia (${soglia})` : `${n} abitanti: fuori dalla soglia del bando (${soglia})`,
    eligibility: true,
    uncertainParams: uncertain(criterion, "abitanti", paramStatus(profile.params.abitanti)),
  };
}

/**
 * Competenze richieste dal bando rispetto a quelle dichiarate dal profilo.
 * Il punteggio è la quota coperta. Non blocca mai: una competenza mancante si può
 * procurare con un partner, un raggruppamento o un incarico esterno.
 */
function scoreCompetenze(profile: Profile, opportunity: Opportunity): ScoreBreakdown {
  const criterion = "Competenze tecniche";
  const richieste = opportunity.competenzeRichieste ?? [];
  const param = profile.params.competenze;
  const disponibili = (param?.value as TechnicalSkill[] | null | undefined) ?? null;

  if (!disponibili) {
    return {
      criterion,
      weight: 0,
      score: 50,
      note: "Competenze del profilo non indicate",
      nonBlocking: true,
      uncertainParams: uncertain(criterion, "competenze", "mancante"),
    };
  }
  const mancanti = richieste.filter((c) => !disponibili.includes(c));
  const score = ((richieste.length - mancanti.length) / richieste.length) * 100;
  const rti = profile.interviewAnswers?.disponibilitaRTI === true ? ": coperture possibili in raggruppamento" : "";
  return {
    criterion,
    weight: 0,
    score,
    note:
      mancanti.length === 0
        ? "Tutte le competenze richieste sono disponibili"
        : `Mancano ${mancanti.map((c) => TECHNICAL_SKILLS[c]).join(", ")}${rti || ": da coprire con un partner"}`,
    nonBlocking: true,
    uncertainParams: uncertain(criterion, "competenze", paramStatus(param)),
  };
}

// ---------------------------------------------------------------------------
// Valutazione complessiva
// ---------------------------------------------------------------------------

/**
 * Criteri che non si applicano a chi lavora come incarico tecnico, con la nota mostrata:
 * riguardano il committente, non lo studio.
 */
const NOT_APPLICABLE_TO_TECHNICAL: Record<string, string> = {
  "Capacità economica": "A carico del committente, non dello studio",
  "Requisiti dimensionali": "Riferiti al committente, non allo studio",
};

export function evaluate(
  profile: Profile,
  opportunity: Opportunity,
  now: Date = new Date()
): Evaluation {
  const role = determineRole(profile, opportunity);
  const evaluatedAt = now.toISOString();

  if (role === null) {
    return {
      opportunityId: opportunity.id,
      profileId: profile.id,
      score: 0,
      scoreRange: [0, 0],
      role: null,
      verdict: "Non applicabile",
      breakdown: [],
      uncertainParams: [],
      evaluatedAt,
    };
  }

  const daysLeft = opportunity.deadline
    ? Math.ceil((new Date(opportunity.deadline).getTime() - now.getTime()) / 86_400_000)
    : null;

  const weights = computeWeights(opportunity, daysLeft);
  const breakdown: ScoreBreakdown[] = [
    { ...scoreTema(profile, opportunity), weight: weights.tema },
    { ...scoreTerritorio(profile, opportunity), weight: weights.territorio },
    { ...scoreCapacitaEconomica(profile, opportunity), weight: weights.capacitaEconomica },
    { ...scoreCapacitaOrganizzativa(profile), weight: weights.capacitaOrganizzativa },
    { ...scoreTempistiche(profile, daysLeft), weight: weights.tempistiche },
  ];
  if (hasDemographicThresholds(opportunity)) {
    breakdown.push({ ...scoreRequisitiDimensionali(profile, opportunity), weight: weights.requisitiDimensionali });
  }
  if (hasRequiredSkills(opportunity)) {
    breakdown.push({ ...scoreCompetenze(profile, opportunity), weight: weights.competenze });
  }

  // In un incarico tecnico il cofinanziamento è a carico del committente, non del
  // profilo valutato, e le soglie demografiche riguardano il Comune committente: questi
  // criteri non gli si applicano e il loro peso viene ridistribuito sugli altri, invece
  // di essere conteggiato come se lo studio dovesse pagare o avere abitanti.
  // Allo stesso modo, per enti pubblici e persone fisiche le competenze tecniche sono
  // quelle dei professionisti che verranno incaricati, non del soggetto valutato.
  const notApplicable: Record<string, string> = role === "incarico-tecnico" ? { ...NOT_APPLICABLE_TO_TECHNICAL } : {};
  if (profile.subjectType === "ente-pubblico" || profile.subjectType === "persona-fisica") {
    notApplicable["Competenze tecniche"] = "Riguardano i professionisti da incaricare, non il soggetto";
  }

  let effective = breakdown;
  const excluded = breakdown.filter((b) => b.criterion in notApplicable);
  if (excluded.length > 0) {
    const others = breakdown.filter((b) => !(b.criterion in notApplicable));
    const freed = excluded.reduce((s, b) => s + b.weight, 0);
    const totalOthers = others.reduce((s, b) => s + b.weight, 0) || 1;
    effective = others.map((b) => ({ ...b, weight: b.weight + (b.weight / totalOthers) * freed }));
    effective.push(
      ...excluded.map((b) => ({
        ...b,
        weight: 0,
        note: notApplicable[b.criterion],
        uncertainParams: [],
      }))
    );
  }

  let score = effective.reduce((sum, b) => sum + b.score * b.weight, 0);

  // La replicabilità su più committenti conta per chi lavora su commessa.
  const interessaReplicabilita = profile.interviewAnswers?.interesseReplicabilita === true;
  if (opportunity.replicabile && interessaReplicabilita) {
    score = Math.min(100, score * REPLICABILITY_MULTIPLIER);
  }

  // Un incarico tecnico non è un'opportunità di serie B: il ruolo viene evidenziato
  // nel verdetto, ma di per sé non penalizza il punteggio. Il cofinanziamento resta a
  // carico del committente (vedi la ridistribuzione dei pesi sopra) e non viene mai
  // conteggiato sulla capacità economica dello studio.
  // Quando però il bando richiede un cofinanziamento, l'incarico dipende dalla capacità
  // dell'amministrazione di sostenerlo: l'opportunità è più incerta e viene ridotta.
  if (role === "incarico-tecnico" && (opportunity.cofinanziamentoRichiestoPct ?? 0) > 0) {
    score = score * TECHNICAL_COFINANCING_FACTOR;
  }

  // Intervallo di incertezza: ogni criterio basato su un dato mancante o stimato allarga
  // la forchetta, in proporzione al peso che quel criterio ha in questo bando. Un dato
  // stimato allarga meno di uno mancante.
  const applicable = effective.filter((b) => b.weight > 0 && b.uncertainParams?.length);
  const spread = applicable.reduce(
    (sum, b) =>
      sum + b.weight * UNCERTAINTY_SPREAD * Math.max(...b.uncertainParams!.map((p) => uncertaintyFactor(p.status))),
    0
  );
  const scoreRange: [number, number] = [
    Math.max(0, Math.round(score - spread / 2)),
    Math.min(100, Math.round(score + spread / 2)),
  ];

  const uncertainParams = applicable.flatMap((b) => b.uncertainParams!);

  return {
    opportunityId: opportunity.id,
    profileId: profile.id,
    score: Math.round(score),
    scoreRange,
    role,
    verdict: deriveVerdict(Math.round(score), role, effective),
    breakdown: effective,
    uncertainParams,
    evaluatedAt,
  };
}

function deriveVerdict(
  score: number,
  role: BeneficiaryRole,
  breakdown: ScoreBreakdown[]
): Evaluation["verdict"] {
  // Un requisito di ammissibilità non soddisfatto blocca qualunque sia il suo peso;
  // gli altri criteri bloccano solo se azzerati con un peso rilevante, tranne quelli
  // che per natura si possono compensare (es. competenze coperte da un partner).
  const blocking = breakdown.find(
    (b) => b.score === 0 && b.weight > 0 && !b.nonBlocking && (b.eligibility || b.weight > 0.15)
  );
  if (blocking) return "NO-GO";
  if (role === "incarico-tecnico") return "Incarico tecnico";
  if (score >= 70) return "GO";
  if (score >= 50) return "GO condizionato";
  if (score >= 30) return "Da approfondire";
  return "NO-GO";
}

/**
 * Simulazione "cosa cambierebbe se…" (requisiti v3, §2).
 * Rivaluta lo stesso bando su varianti del profilo: è il motivo per cui ogni campo
 * del profilo è modificabile e nessuno è trattato come dato fisso.
 */
export function simulate(
  profile: Profile,
  opportunity: Opportunity,
  variants: Array<{ label: string; params: Partial<Profile["params"]> }>,
  now: Date = new Date()
): Array<{ label: string; evaluation: Evaluation }> {
  return variants.map((variant) => ({
    label: variant.label,
    evaluation: evaluate(
      { ...profile, params: { ...profile.params, ...variant.params } },
      opportunity,
      now
    ),
  }));
}
