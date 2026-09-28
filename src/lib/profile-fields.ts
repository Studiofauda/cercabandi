/**
 * Elenco dei parametri modificabili di un profilo, con etichetta e tipo di campo.
 * Le domande dell'intervista sono la fonte principale; si aggiungono i parametri che il
 * motore di valutazione usa ma che l'intervista oggi non chiede.
 */

import { buildInterview, type Answers, type Question } from "@/core/interview";
import type { ProfileParams, SubjectType } from "@/core/types";

export interface ParamField {
  key: string;
  label: string;
  kind: "number" | "text" | "boolean" | "multi";
  help?: string;
  options?: Array<{ value: string; label: string }>;
}

const LABELS: Record<string, string> = {
  regione: "Regione",
  provincia: "Provincia",
  comune: "Comune",
  abitanti: "Abitanti",
  classificazioni: "Classificazioni del territorio",
  capacitaCofinanziamento: "Capacità di cofinanziamento (€)",
  anticipazioneCassa: "Anticipazione di cassa",
  rupDisponibile: "RUP interno disponibile",
  preavvisoMinimoGiorni: "Preavviso minimo (giorni)",
  fatturatoAnnuo: "Fatturato annuo medio (€)",
  certificazioni: "Certificazioni",
  polizzeMassimali: "Massimale polizza (€)",
  personaleTecnico: "Personale tecnico (persone)",
  competenze: "Competenze tecniche interne",
  regioniOperative: "Regioni in cui operate",
  produzioneStandard: "Produzione standard (€)",
  superficie: "Superficie del fondo (ettari)",
};

/** Usati dal motore ma non chiesti dall'intervista. */
const EXTRA: ParamField[] = [
  {
    key: "personaleTecnico",
    label: LABELS.personaleTecnico,
    kind: "number",
    help: "Il motore lo usa per la capacità organizzativa di imprese e associazioni.",
  },
];

export function paramLabel(key: string): string {
  return LABELS[key] ?? key;
}

function fromQuestion(q: Question): ParamField {
  return {
    key: q.paramKey!,
    label: paramLabel(q.paramKey!),
    kind: q.kind === "single" ? "text" : (q.kind as ParamField["kind"]),
    help: q.help,
    options: q.options?.map((o) => ({ value: o.value, label: o.label })),
  };
}

/** Campi da mostrare per un profilo: quelli del suo percorso d'intervista, più gli extra e quelli già presenti. */
export function paramFieldsFor(subjectType: SubjectType, answers: Answers, params: ProfileParams): ParamField[] {
  const fields = new Map<string, ParamField>();
  for (const q of buildInterview(subjectType, answers)) if (q.paramKey) fields.set(q.paramKey, fromQuestion(q));
  if (subjectType !== "ente-pubblico") for (const f of EXTRA) if (!fields.has(f.key)) fields.set(f.key, f);
  for (const key of Object.keys(params)) {
    if (fields.has(key)) continue;
    const v = params[key]?.value;
    fields.set(key, {
      key,
      label: paramLabel(key),
      kind: typeof v === "number" ? "number" : typeof v === "boolean" ? "boolean" : Array.isArray(v) ? "multi" : "text",
    });
  }
  return Array.from(fields.values());
}
