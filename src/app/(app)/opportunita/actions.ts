"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/db/queries";

/*
 * Azioni del pannello di dettaglio. I permessi li controlla il database (RLS):
 * un utente in sola lettura riceve un errore e la modifica non avviene.
 */

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

/** Una voce per riga, righe vuote ignorate. */
function lines(formData: FormData, name: string): string[] {
  return field(formData, name)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/** Torna alla stessa pagina (con il pannello aperto), eventualmente con un messaggio d'errore. */
function back(formData: FormData, error?: string): never {
  const url = new URL(field(formData, "back") || "/opportunita", "http://x");
  if (error) url.searchParams.set("errore", error);
  else url.searchParams.delete("errore");
  revalidatePath("/opportunita");
  redirect(url.pathname + url.search);
}

export async function dismissOpportunity(formData: FormData) {
  const reason = field(formData, "reason");
  if (!reason) back(formData, "Indica il motivo dello scarto.");

  const supabase = await createClient();
  const { error } = await supabase.from("dismissals").upsert({
    workspace_id: await getWorkspaceId(),
    opportunity_id: field(formData, "opportunityId"),
    profile_id: field(formData, "profileId"),
    reason,
    dismissed_at: new Date().toISOString(),
  });
  back(formData, error ? "Scarto non salvato: controlla di avere i permessi di modifica." : undefined);
}

export async function restoreOpportunity(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("dismissals")
    .delete()
    .eq("opportunity_id", field(formData, "opportunityId"))
    .eq("profile_id", field(formData, "profileId"));
  back(formData, error ? "Ripristino non riuscito: controlla di avere i permessi di modifica." : undefined);
}

export async function saveAssessmentNote(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("assessment_notes").upsert({
    workspace_id: await getWorkspaceId(),
    opportunity_id: field(formData, "opportunityId"),
    profile_id: field(formData, "profileId"),
    eligibility: field(formData, "eligibility") || null,
    advantages: lines(formData, "advantages"),
    weaknesses: lines(formData, "weaknesses"),
    red_flags: lines(formData, "red_flags"),
    next_steps: lines(formData, "next_steps"),
    updated_at: new Date().toISOString(),
  });
  back(formData, error ? "Note non salvate: controlla di avere i permessi di modifica." : undefined);
}

/** Toglie l'etichetta «da verificare» dopo il controllo sui testi ufficiali. */
export async function markVerified(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("opportunities")
    .update({ needs_review: false, verified_at: new Date().toISOString() })
    .eq("id", field(formData, "opportunityId"));
  back(formData, error ? "Aggiornamento non riuscito: controlla di avere i permessi di modifica." : undefined);
}
