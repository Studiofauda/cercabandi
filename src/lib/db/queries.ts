import { createClient } from "@/lib/supabase/server";
import {
  toOpportunity,
  toProfile,
  toSource,
  type OpportunityRow,
  type ProfileRow,
  type SourceRow,
} from "./mappers";

/*
 * Letture dal database. Non serve filtrare per spazio di lavoro: le regole di accesso
 * (RLS) restituiscono solo le righe che l'utente collegato può vedere.
 */

export async function getProfiles() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("*").order("name");
  if (error) throw new Error(`Lettura profili non riuscita: ${error.message}`);
  return (data as ProfileRow[]).map((row) => ({ profile: toProfile(row), row }));
}

export async function getOpportunities() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("opportunities").select("*");
  if (error) throw new Error(`Lettura bandi non riuscita: ${error.message}`);
  return (data as OpportunityRow[]).map((row) => ({ opportunity: toOpportunity(row), row }));
}

/** Spazio di lavoro dell'utente collegato: serve per le scritture. */
export async function getWorkspaceId(): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("workspace_members").select("workspace_id").limit(1).single();
  if (error || !data) throw new Error("Nessuno spazio di lavoro associato a questo utente.");
  return data.workspace_id as string;
}

export interface DismissalRow {
  opportunity_id: string;
  profile_id: string;
  reason: string;
  dismissed_at: string;
}

/** Bandi scartati per un profilo, indicizzati per bando. */
export async function getDismissals(profileId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dismissals")
    .select("opportunity_id, profile_id, reason, dismissed_at")
    .eq("profile_id", profileId);
  if (error) throw new Error(`Lettura scarti non riuscita: ${error.message}`);
  return new Map((data as DismissalRow[]).map((d) => [d.opportunity_id, d]));
}

export interface AssessmentNoteRow {
  eligibility: string | null;
  advantages: string[];
  weaknesses: string[];
  red_flags: string[];
  next_steps: string[];
  updated_at: string;
}

/** Analisi qualitativa compilata dal team per una coppia bando × profilo. */
export async function getAssessmentNote(opportunityId: string, profileId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assessment_notes")
    .select("eligibility, advantages, weaknesses, red_flags, next_steps, updated_at")
    .eq("opportunity_id", opportunityId)
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) throw new Error(`Lettura note non riuscita: ${error.message}`);
  return data as AssessmentNoteRow | null;
}

export async function getSources() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("sources").select("*").order("scope").order("name");
  if (error) throw new Error(`Lettura fonti non riuscita: ${error.message}`);
  return (data as SourceRow[]).map((row) => ({ source: toSource(row), row }));
}
