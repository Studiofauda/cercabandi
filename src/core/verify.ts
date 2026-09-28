/**
 * Verifica rapida della logica su casi reali, per controllare che le decisioni
 * prese nei requisiti producano davvero i risultati attesi.
 */

import { buildInterview, deriveFromAnswers, isTemplateFromAnswers } from "./interview";
import { evaluate, simulate, DIGEST_THRESHOLD } from "./scoring";
import { findCombinations, describeCombination } from "./combinations";
import type { Opportunity, Profile, TechnicalSkill } from "./types";

function param<T>(value: T, confidence: "verificato" | "stimato" | "ipotesi" = "verificato") {
  return { value, confidence };
}

const now = new Date("2026-09-24T00:00:00Z");

// --- Studio Fauda, come emergerebbe dall'intervista -------------------------
const answersFauda = {
  subjectType: "impresa",
  attivitaPrevalente: ["progettazione", "infrastrutture", "idraulica", "urbanistica"],
  lavoraPerEnti: true,
  interesseReplicabilita: true,
  fatturatoAnnuo: 900_000,
  regione: "Piemonte",
};
const derivedFauda = deriveFromAnswers("impresa", answersFauda);

const studioFauda: Profile = {
  id: "studio-fauda",
  name: "Studio Fauda",
  shortName: "SF",
  subjectType: "impresa",
  organizationType: "Studio di ingegneria",
  themes: derivedFauda.themes,
  packs: derivedFauda.packs,
  params: {
    regione: param("Piemonte"),
    capacitaCofinanziamento: param(50_000, "stimato"),
    preavvisoMinimoGiorni: param(20),
  },
  interviewAnswers: answersFauda,
  isTemplate: false,
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
};

// --- Piccolo Comune, come modello parametrico ------------------------------
const answersComune = {
  subjectType: "ente-pubblico",
  entePubblicoTipo: "comune",
  ambitiInteresse: ["infrastrutture", "energia", "cultura"],
  classificazioni: ["montano"],
  rupDisponibile: false,
  isTemplate: "modello",
};
const derivedComune = deriveFromAnswers("ente-pubblico", answersComune);

const piccoloComune: Profile = {
  id: "piccolo-comune",
  name: "Piccolo Comune (modello)",
  shortName: "PC",
  subjectType: "ente-pubblico",
  organizationType: "Comune montano di piccola dimensione",
  themes: derivedComune.themes,
  packs: derivedComune.packs,
  params: {
    regione: param("Piemonte"),
    abitanti: param(800),
    rupDisponibile: param(false),
    capacitaCofinanziamento: param(30_000, "stimato"),
  },
  interviewAnswers: answersComune,
  isTemplate: isTemplateFromAnswers(answersComune),
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
};

// --- Un bando destinato ai Comuni ------------------------------------------
const bandoEfficientamento: Opportunity = {
  id: "efficientamento-scuole",
  title: "Efficientamento energetico degli edifici scolastici",
  authority: "Regione Piemonte",
  level: "Regionale",
  status: "Aperto",
  theme: "Efficienza energetica",
  territory: "Piemonte",
  eligibleSubjectTypes: ["ente-pubblico"],
  packs: ["energy", "engineering-procurement", "public-territorial"],
  budgetTotale: 4_000_000,
  contributoMax: 400_000,
  cofinanziamentoRichiestoPct: 20,
  deadline: "2026-11-30",
  replicabile: true,
  sourceId: "regione-piemonte",
  sourceUrl: "https://example.org",
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
};

console.log("=== Intervista: numero di domande per percorso ===");
for (const t of ["ente-pubblico", "impresa", "associazione", "persona-fisica"] as const) {
  console.log(`  ${t}: ${buildInterview(t).length} domande`);
}

console.log("\n=== Temi e ambiti derivati automaticamente ===");
console.log("  Studio Fauda  ->", derivedFauda.packs.join(", "));
console.log("  Piccolo Comune ->", derivedComune.packs.join(", "));

console.log("\n=== Stesso bando, due profili diversi ===");
const evalComune = evaluate(piccoloComune, bandoEfficientamento, now);
console.log(`  Piccolo Comune: ${evalComune.score} (${evalComune.scoreRange[0]}–${evalComune.scoreRange[1]}) · ${evalComune.verdict} · ruolo: ${evalComune.role}`);

const evalFauda = evaluate(studioFauda, bandoEfficientamento, now);
console.log(`  Studio Fauda:   ${evalFauda.score} (${evalFauda.scoreRange[0]}–${evalFauda.scoreRange[1]}) · ${evalFauda.verdict} · ruolo: ${evalFauda.role}`);
console.log("  -> Studio Fauda non è beneficiario, ma il bando resta visibile come incarico tecnico.");

console.log("\n=== Dati incerti da completare (portano al campo giusto) ===");
for (const [nome, ev] of [["Piccolo Comune", evalComune], ["Studio Fauda", evalFauda]] as const) {
  const elenco = ev.uncertainParams.map((p) => `${p.key} (${p.subject}, ${p.status}) → ${p.criterion}`);
  console.log(`  ${nome}: ${elenco.join("; ") || "nessuno"}`);
}

console.log("\n=== Simulazione: lo stesso modello di Comune, parametri diversi ===");
const varianti = simulate(
  piccoloComune,
  bandoEfficientamento,
  [
    { label: "800 abitanti, Piemonte, cofin. 30k", params: {} },
    { label: "5.000 abitanti, Piemonte, cofin. 150k", params: { abitanti: param(5000), capacitaCofinanziamento: param(150_000) } },
    { label: "800 abitanti, Lombardia, cofin. 30k", params: { regione: param("Lombardia") } },
    { label: "800 abitanti, Piemonte, con RUP interno", params: { rupDisponibile: param(true) } },
  ],
  now
);
for (const v of varianti) {
  console.log(`  ${v.label.padEnd(44)} -> ${String(v.evaluation.score).padStart(3)} · ${v.evaluation.verdict}`);
}

console.log("\n=== Dettaglio dei criteri (Piccolo Comune) ===");
for (const b of evalComune.breakdown) {
  const flag = b.uncertainParams?.length ? `  [${b.uncertainParams.map((p) => p.status).join(", ")}]` : "";
  console.log(`  ${b.criterion.padEnd(26)} peso ${(b.weight * 100).toFixed(0).padStart(3)}%  punteggio ${String(Math.round(b.score)).padStart(3)}  — ${b.note}${flag}`);
}

console.log(`\n=== Digest: soglia di segnalazione = ${DIGEST_THRESHOLD}% ===`);
console.log(`  Il bando ${evalComune.score >= DIGEST_THRESHOLD ? "VERREBBE" : "non verrebbe"} segnalato per il Piccolo Comune.`);

// ---------------------------------------------------------------------------
// Soglie demografiche: gli abitanti come requisito di ammissibilità
// ---------------------------------------------------------------------------

const bandoPiccoliComuni: Opportunity = {
  id: "piccoli-comuni",
  title: "Fondo per la rigenerazione dei piccoli Comuni",
  authority: "Ministero dell'Interno",
  level: "Nazionale",
  status: "Aperto",
  theme: "Rigenerazione urbana",
  territory: "Italia",
  eligibleSubjectTypes: ["ente-pubblico"],
  packs: ["public-territorial", "engineering-procurement"],
  abitantiMax: 5000,
  contributoMax: 300_000,
  cofinanziamentoRichiestoPct: 0,
  deadline: "2026-12-31",
  replicabile: true,
  sourceId: "min-interno",
  sourceUrl: "https://example.org",
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
};

console.log("\n=== Soglie demografiche: bando per Comuni fino a 5.000 abitanti ===");
const variantiSoglia = simulate(
  piccoloComune,
  bandoPiccoliComuni,
  [
    { label: "800 abitanti", params: {} },
    { label: "6.000 abitanti", params: { abitanti: param(6000) } },
    { label: "4.500 abitanti (stimati)", params: { abitanti: param(4500, "stimato") } },
    { label: "abitanti non indicati", params: { abitanti: undefined } },
  ],
  now
);
for (const v of variantiSoglia) {
  const e = v.evaluation;
  console.log(`  ${v.label.padEnd(26)} -> ${String(e.score).padStart(3)} (${e.scoreRange[0]}–${e.scoreRange[1]}) · ${e.verdict}`);
}
const evalFaudaSoglia = evaluate(studioFauda, bandoPiccoliComuni, now);
console.log(`  Studio Fauda (incarico)    -> ${String(evalFaudaSoglia.score).padStart(3)} (${evalFaudaSoglia.scoreRange[0]}–${evalFaudaSoglia.scoreRange[1]}) · ${evalFaudaSoglia.verdict}`);
console.log(`     ${evalFaudaSoglia.breakdown.find((b) => b.criterion === "Requisiti dimensionali")?.note}`);

// ---------------------------------------------------------------------------
// Cumulabilità: bandi diversi sullo stesso progetto
// ---------------------------------------------------------------------------

const bandoStrutturale: Opportunity = {
  id: "sicurezza-strutturale",
  title: "Adeguamento sismico degli edifici pubblici",
  authority: "Ministero dell'Interno",
  level: "Nazionale",
  status: "Aperto",
  theme: "Sicurezza strutturale",
  territory: "Italia",
  eligibleSubjectTypes: ["ente-pubblico"],
  packs: ["engineering-procurement", "public-territorial"],
  expenseCategories: ["opere-strutturali", "progettazione", "studi-indagini"],
  fundingSource: "Nazionale",
  budgetTotale: 2_000_000,
  contributoMax: 500_000,
  cofinanziamentoRichiestoPct: 0,
  deadline: "2026-12-15",
  replicabile: true,
  sourceId: "min-interno",
  sourceUrl: "https://example.org",
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
};

const bandoArredi: Opportunity = {
  id: "arredi-didattici",
  title: "Rinnovo arredi e attrezzature didattiche",
  authority: "Ministero dell'Istruzione",
  level: "Nazionale",
  status: "Aperto",
  theme: "Edilizia scolastica",
  territory: "Italia",
  eligibleSubjectTypes: ["ente-pubblico"],
  packs: ["public-territorial", "culture-digital"],
  expenseCategories: ["arredi-attrezzature", "digitalizzazione"],
  fundingSource: "Nazionale",
  contributoMax: 80_000,
  cofinanziamentoRichiestoPct: 0,
  deadline: "2026-12-01",
  replicabile: true,
  sourceId: "min-istruzione",
  sourceUrl: "https://example.org",
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
};

const bandoEuSovrapposto: Opportunity = {
  id: "eu-energia",
  title: "Programma europeo per l'efficienza energetica degli edifici",
  authority: "Commissione europea",
  level: "Europeo",
  status: "Aperto",
  theme: "Efficienza energetica",
  territory: "Unione europea",
  eligibleSubjectTypes: ["ente-pubblico"],
  packs: ["energy", "engineering-procurement"],
  // Copre le stesse voci del bando regionale di efficientamento: rischio di doppio finanziamento.
  expenseCategories: ["efficientamento-energetico", "impianti", "progettazione"],
  fundingSource: "UE",
  contributoMax: 600_000,
  cofinanziamentoRichiestoPct: 30,
  deadline: "2026-11-20",
  replicabile: false,
  sourceId: "ec-portal",
  sourceUrl: "https://example.org",
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
};

// Il bando di efficientamento già definito sopra, completato con le voci di spesa.
const bandoEfficientamentoDettagliato: Opportunity = {
  ...bandoEfficientamento,
  expenseCategories: ["efficientamento-energetico", "impianti", "progettazione"],
  fundingSource: "Regionale",
};

console.log("\n=== Bandi combinabili sullo stesso progetto ===");
const catalogo = [bandoEfficientamentoDettagliato, bandoStrutturale, bandoArredi, bandoEuSovrapposto];
const combinazioni = findCombinations(piccoloComune, catalogo, { includeRejected: true });

for (const c of combinazioni) {
  console.log("\n" + describeCombination(c, catalogo));
}

// ---------------------------------------------------------------------------
// Competenze tecniche: richieste dal bando, dichiarate dal profilo
// ---------------------------------------------------------------------------

const garaServiziTecnici: Opportunity = {
  id: "gara-ponte",
  title: "Progettazione e CSP per l'adeguamento di un ponte comunale",
  authority: "Comune di Varallo",
  level: "Locale",
  status: "Aperto",
  theme: "Ponti e viabilità",
  territory: "Piemonte",
  eligibleSubjectTypes: ["impresa"],
  packs: ["engineering-procurement"],
  competenzeRichieste: ["progettazione-strutturale", "geologia-geotecnica", "sicurezza-cantiere"],
  budgetTotale: 180_000,
  cofinanziamentoRichiestoPct: 0,
  deadline: "2026-11-15",
  replicabile: false,
  sourceId: "comune",
  sourceUrl: "https://example.org",
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
};

console.log("\n=== Competenze tecniche: gara che richiede strutture, geologia e CSP ===");
const variantiCompetenze = simulate(
  studioFauda,
  garaServiziTecnici,
  [
    { label: "competenze non indicate", params: {} },
    { label: "strutture + sicurezza (manca geologia)", params: { competenze: param<TechnicalSkill[]>(["progettazione-strutturale", "sicurezza-cantiere", "idraulica"]) } },
    { label: "nessuna delle tre", params: { competenze: param<TechnicalSkill[]>(["idraulica"]) } },
    { label: "tutte e tre", params: { competenze: param<TechnicalSkill[]>(["progettazione-strutturale", "geologia-geotecnica", "sicurezza-cantiere"]) } },
  ],
  now
);
for (const v of variantiCompetenze) {
  const e = v.evaluation;
  const c = e.breakdown.find((b) => b.criterion === "Competenze tecniche")!;
  console.log(`  ${v.label.padEnd(40)} -> ${String(e.score).padStart(3)} (${e.scoreRange[0]}–${e.scoreRange[1]}) · ${e.verdict.padEnd(16)} ${c.note}`);
}
const evalComuneGara = evaluate(piccoloComune, { ...garaServiziTecnici, eligibleSubjectTypes: ["ente-pubblico"] }, now);
console.log(`  Piccolo Comune (stesso bando) -> ${evalComuneGara.score} · ${evalComuneGara.breakdown.find((b) => b.criterion === "Competenze tecniche")?.note}`);

// ---------------------------------------------------------------------------
// Territorio nelle gare: orienta, non esclude
// ---------------------------------------------------------------------------

const garaLazio: Opportunity = {
  ...garaServiziTecnici,
  id: "gara-lazio",
  title: "Progettazione di un edificio scolastico a Civitavecchia",
  authority: "Comune di Civitavecchia",
  territory: "Civitavecchia (RM) · Lazio",
  kind: "gara",
  competenzeRichieste: [],
};
const contributoLazio: Opportunity = { ...garaLazio, id: "contributo-lazio", kind: "contributo", eligibleSubjectTypes: ["impresa"] };

console.log("\n=== Territorio: gara e contributo nel Lazio per Studio Fauda (Piemonte) ===");
const territorio = [
  { label: "gara, regioni operative non indicate", o: garaLazio, params: {} },
  { label: "gara, opera in Piemonte e Liguria", o: garaLazio, params: { regioniOperative: param(["Piemonte", "Liguria"]) } },
  { label: "gara, opera anche nel Lazio", o: garaLazio, params: { regioniOperative: param(["Piemonte", "Lazio"]) } },
  { label: "contributo regionale del Lazio", o: contributoLazio, params: {} },
];
for (const t of territorio) {
  const e = evaluate({ ...studioFauda, params: { ...studioFauda.params, ...t.params } }, t.o, now);
  const c = e.breakdown.find((b) => b.criterion === "Coerenza territoriale")!;
  console.log(`  ${t.label.padEnd(38)} -> ${String(e.score).padStart(3)} · ${e.verdict.padEnd(10)} ${c.note}`);
}
