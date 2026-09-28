import { EXPENSE_CATEGORIES, type ExpenseCategory, type PackId, type SubjectType } from "@/core/types";

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

/** Stesse voci del nucleo, con l'iniziale maiuscola per le etichette dell'interfaccia. */
export const EXPENSE_LABELS = Object.fromEntries(
  Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => [k, v.charAt(0).toUpperCase() + v.slice(1)])
) as Record<ExpenseCategory, string>;

export const labelList = <K extends string>(labels: Record<K, string>, values: K[] | undefined) =>
  values?.length ? values.map((v) => labels[v] ?? v).join(", ") : "";
