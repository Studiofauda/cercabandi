/**
 * Dalle risposte dell'intervista ai campi del profilo. Usa il nucleo (buildInterview,
 * deriveFromAnswers, isTemplateFromAnswers) senza modificarlo: qui c'è solo la traduzione
 * verso il formato salvato nel database.
 */

import { buildInterview, deriveFromAnswers, isTemplateFromAnswers, type Answers, type Question } from "@/core/interview";
import type { PackId, ParamValue, ProfileParams, SubjectType } from "@/core/types";

export interface InterviewInput {
  answers: Answers;
  /** Domande (per id) la cui risposta numerica è una stima. */
  estimates: Record<string, boolean>;
  name: string;
  shortName: string;
  organizationType: string;
  packOverrides: { add: PackId[]; remove: PackId[] };
}

/** Tiene solo le risposte alle domande effettivamente previste dal percorso scelto. */
export function cleanAnswers(answers: Answers): { subjectType: SubjectType; answers: Answers; questions: Question[] } {
  const subjectType = answers.subjectType as SubjectType;
  const questions = buildInterview(subjectType, answers);
  const kept: Answers = {};
  for (const q of questions) {
    const a = answers[q.id];
    if (a !== undefined && a !== null && a !== "" && !(Array.isArray(a) && a.length === 0)) kept[q.id] = a;
  }
  return { subjectType, answers: kept, questions };
}

/** Parametri alimentati dalle risposte (le domande con `paramKey`). */
export function paramsFromAnswers(
  questions: Question[],
  answers: Answers,
  estimates: Record<string, boolean>,
  now = new Date().toISOString()
): ProfileParams {
  const params: ProfileParams = {};
  for (const q of questions) {
    if (!q.paramKey || answers[q.id] === undefined) continue;
    const value: ParamValue<unknown> = {
      value: answers[q.id],
      confidence: estimates[q.id] ? "stimato" : "verificato",
      source: "Intervista",
      updatedAt: now,
    };
    params[q.paramKey] = value;
  }
  return params;
}

export function applyPackOverrides(packs: PackId[], overrides: { add?: PackId[]; remove?: PackId[] }): PackId[] {
  const set = new Set(packs);
  overrides.add?.forEach((p) => set.add(p));
  overrides.remove?.forEach((p) => set.delete(p));
  return Array.from(set);
}

/** Tutto ciò che l'intervista determina nel profilo, pronto per il database. */
export function profileFromInterview(input: InterviewInput) {
  const { subjectType, answers, questions } = cleanAnswers(input.answers);
  const derived = deriveFromAnswers(subjectType, answers);
  return {
    subject_type: subjectType,
    themes: derived.themes,
    packs: applyPackOverrides(derived.packs, input.packOverrides),
    pack_overrides: input.packOverrides,
    interview_answers: answers,
    is_template: isTemplateFromAnswers(answers),
    params: paramsFromAnswers(questions, answers, input.estimates),
  };
}
