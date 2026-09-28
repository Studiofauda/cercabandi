/**
 * Traduzione tra le righe del database e i tipi del nucleo (src/core/types.ts).
 * È l'unico punto che conosce i nomi delle colonne: se il database cambia, si cambia qui
 * e il motore di valutazione non se ne accorge.
 */

import type {
  ExpenseCategory,
  FundingSource,
  Opportunity,
  OpportunityLevel,
  OpportunityStatus,
  PackId,
  Profile,
  ProfileParams,
  Source,
  SourceReliability,
  SourceScope,
  SubjectType,
} from "@/core/types";

// Righe come arrivano da Supabase (numeri e date possono arrivare come stringhe).

export interface OpportunityRow {
  id: string;
  external_code: string | null;
  title: string;
  authority: string;
  level: string;
  status: string;
  theme: string;
  territory: string;
  eligible_subject_types: string[];
  packs: string[];
  expense_categories: string[] | null;
  funding_source: string | null;
  cumulabile: boolean | null;
  cofinanziamento_da_altri_fondi: boolean | null;
  budget_totale: number | string | null;
  contributo_max: number | string | null;
  cofinanziamento_richiesto_pct: number | string | null;
  abitanti_min: number | null;
  abitanti_max: number | null;
  deadline: string | null;
  expected_publication: string | null;
  replicabile: boolean;
  partnership_richieste: string[] | null;
  source_id: string | null;
  source_url: string;
  verified_at: string | null;
  needs_review: boolean;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileRow {
  id: string;
  name: string;
  short_name: string;
  subject_type: string;
  organization_type: string;
  themes: string[];
  packs: string[];
  pack_overrides: Profile["packOverrides"] | null;
  params: ProfileParams;
  interview_answers: Record<string, unknown> | null;
  is_template: boolean;
  notes: string | null;
  evidence_ready: string[];
  evidence_missing: string[];
  created_at: string;
  updated_at: string;
}

export interface SourceRow {
  id: string;
  name: string;
  url: string;
  covers: string;
  level: string;
  scope: string;
  packs: string[];
  reliability: string;
  method: string;
  has_api: boolean;
  last_checked_at: string | null;
  feedback_useful: number;
  feedback_not_useful: number;
}

const num = (v: number | string | null): number | undefined =>
  v === null || v === undefined ? undefined : Number(v);
const opt = <T>(v: T | null): T | undefined => (v === null ? undefined : v);

export function toOpportunity(r: OpportunityRow): Opportunity {
  return {
    id: r.id,
    title: r.title,
    authority: r.authority,
    level: r.level as OpportunityLevel,
    status: r.status as OpportunityStatus,
    theme: r.theme,
    territory: r.territory,
    eligibleSubjectTypes: r.eligible_subject_types as SubjectType[],
    packs: r.packs as PackId[],
    expenseCategories: opt(r.expense_categories) as ExpenseCategory[] | undefined,
    fundingSource: opt(r.funding_source) as FundingSource | undefined,
    cumulabile: opt(r.cumulabile),
    cofinanziamentoDaAltriFondi: opt(r.cofinanziamento_da_altri_fondi),
    budgetTotale: num(r.budget_totale),
    contributoMax: num(r.contributo_max),
    cofinanziamentoRichiestoPct: num(r.cofinanziamento_richiesto_pct),
    abitantiMin: opt(r.abitanti_min),
    abitantiMax: opt(r.abitanti_max),
    deadline: opt(r.deadline),
    expectedPublication: opt(r.expected_publication),
    replicabile: r.replicabile,
    partnershipRichieste: opt(r.partnership_richieste),
    sourceId: r.source_id ?? "",
    sourceUrl: r.source_url,
    verifiedAt: opt(r.verified_at),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function toProfile(r: ProfileRow): Profile {
  return {
    id: r.id,
    name: r.name,
    shortName: r.short_name,
    subjectType: r.subject_type as SubjectType,
    organizationType: r.organization_type,
    themes: r.themes,
    packs: r.packs as PackId[],
    packOverrides: opt(r.pack_overrides),
    params: r.params ?? {},
    interviewAnswers: opt(r.interview_answers),
    isTemplate: r.is_template,
    notes: opt(r.notes),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function toSource(r: SourceRow): Source {
  return {
    id: r.id,
    name: r.name,
    url: r.url,
    covers: r.covers,
    level: r.level,
    scope: r.scope as SourceScope,
    packs: r.packs as PackId[],
    reliability: r.reliability as SourceReliability,
    method: r.method,
    hasApi: r.has_api,
    lastCheckedAt: opt(r.last_checked_at),
    feedback: { useful: r.feedback_useful, notUseful: r.feedback_not_useful },
  };
}
