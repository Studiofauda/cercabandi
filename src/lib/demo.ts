/**
 * Dati di esempio TEMPORANEI, usati solo finché il database non è collegato (passi 2–3).
 * Servono a vedere il nucleo di valutazione funzionare dentro l'applicazione.
 */

import { deriveFromAnswers, isTemplateFromAnswers } from "@/core/interview";
import type { Opportunity, ParamValue, Profile } from "@/core/types";

function param<T>(value: T, confidence: ParamValue<T>["confidence"] = "verificato"): ParamValue<T> {
  return { value, confidence };
}

const stamp = "2026-09-24T00:00:00Z";

const answersFauda = {
  subjectType: "impresa",
  attivitaPrevalente: ["progettazione", "infrastrutture", "idraulica", "urbanistica"],
  lavoraPerEnti: true,
  interesseReplicabilita: true,
  regione: "Piemonte",
  isTemplate: "reale",
};

const answersComune = {
  subjectType: "ente-pubblico",
  entePubblicoTipo: "comune",
  ambitiInteresse: ["infrastrutture", "energia", "cultura"],
  classificazioni: ["montano"],
  rupDisponibile: false,
  isTemplate: "modello",
};

export const DEMO_PROFILES: Profile[] = [
  {
    id: "studio-fauda",
    name: "Studio Fauda",
    shortName: "SF",
    subjectType: "impresa",
    organizationType: "Studio di ingegneria",
    ...deriveFromAnswers("impresa", answersFauda),
    params: {
      regione: param("Piemonte"),
      capacitaCofinanziamento: param(50_000, "stimato"),
      preavvisoMinimoGiorni: param(20),
    },
    interviewAnswers: answersFauda,
    isTemplate: isTemplateFromAnswers(answersFauda),
    createdAt: stamp,
    updatedAt: stamp,
  },
  {
    id: "piccolo-comune",
    name: "Piccolo Comune (modello)",
    shortName: "PC",
    subjectType: "ente-pubblico",
    organizationType: "Comune montano di piccola dimensione",
    ...deriveFromAnswers("ente-pubblico", answersComune),
    params: {
      regione: param("Piemonte"),
      abitanti: param(800),
      rupDisponibile: param(false),
      capacitaCofinanziamento: param(30_000, "stimato"),
    },
    interviewAnswers: answersComune,
    isTemplate: isTemplateFromAnswers(answersComune),
    createdAt: stamp,
    updatedAt: stamp,
  },
];

const base = { sourceUrl: "https://example.org", createdAt: stamp, updatedAt: stamp };

export const DEMO_OPPORTUNITIES: Opportunity[] = [
  {
    ...base,
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
  },
  {
    ...base,
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
  },
  {
    ...base,
    id: "eu-energia",
    title: "Programma europeo per l'efficienza energetica degli edifici",
    authority: "Commissione europea",
    level: "Europeo",
    status: "Aperto",
    theme: "Efficienza energetica",
    territory: "Unione europea",
    eligibleSubjectTypes: ["ente-pubblico"],
    packs: ["energy", "engineering-procurement"],
    contributoMax: 600_000,
    cofinanziamentoRichiestoPct: 30,
    deadline: "2026-10-12",
    replicabile: false,
    sourceId: "ec-portal",
  },
  {
    ...base,
    id: "arredi-didattici",
    title: "Rinnovo arredi e attrezzature didattiche",
    authority: "Ministero dell'Istruzione",
    level: "Nazionale",
    status: "In arrivo",
    theme: "Edilizia scolastica",
    territory: "Italia",
    eligibleSubjectTypes: ["ente-pubblico"],
    packs: ["public-territorial", "culture-digital"],
    replicabile: true,
    sourceId: "min-istruzione",
  },
];
