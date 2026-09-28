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

export async function getSources() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("sources").select("*").order("scope").order("name");
  if (error) throw new Error(`Lettura fonti non riuscita: ${error.message}`);
  return (data as SourceRow[]).map((row) => ({ source: toSource(row), row }));
}
