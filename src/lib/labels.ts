import type { ExpenseCategory, PackId, SubjectType } from "@/core/types";

/** Nomi leggibili dei valori del modello dati, per l'interfaccia. */

export const PACK_LABELS: Record<PackId, string> = {
  "engineering-procurement": "Ingegneria e appalti",
  "public-territorial": "Enti pubblici e territorio",
  "agri-rural": "Agricoltura e ruralità",
  "culture-digital": "Cultura e digitale",
  "civic-nonprofit": "Terzo settore",
  "private-philanthropy": "Fondazioni e filantropia",
  health: "Sanità e sociale",
  tourism: "Turismo",
  energy: "Energia",
};

export const SUBJECT_LABELS: Record<SubjectType, string> = {
  "ente-pubblico": "Enti pubblici",
  impresa: "Imprese e studi",
  associazione: "Associazioni e terzo settore",
  "persona-fisica": "Persone fisiche",
};

export const EXPENSE_LABELS: Record<ExpenseCategory, string> = {
  progettazione: "Progettazione",
  "direzione-lavori": "Direzione lavori",
  "opere-strutturali": "Opere strutturali",
  "efficientamento-energetico": "Efficientamento energetico",
  impianti: "Impianti",
  restauro: "Restauro",
  "arredi-attrezzature": "Arredi e attrezzature",
  digitalizzazione: "Digitalizzazione",
  formazione: "Formazione",
  personale: "Personale",
  comunicazione: "Comunicazione",
  "studi-indagini": "Studi e indagini",
};

export const labelList = <K extends string>(labels: Record<K, string>, values: K[] | undefined) =>
  values?.length ? values.map((v) => labels[v] ?? v).join(", ") : "";
