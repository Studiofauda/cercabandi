"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ParamValue, ProfileParams } from "@/core/types";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getWorkspaceId } from "@/lib/db/queries";
import { profileFromInterview, type InterviewInput } from "@/lib/profile-build";
import { paramFieldsFor } from "@/lib/profile-fields";

export type ActionResult = { error?: string };

function validateIdentity(input: InterviewInput): string | null {
  if (!input.answers.subjectType) return "Manca il tipo di soggetto.";
  if (!input.name.trim()) return "Dai un nome al profilo.";
  if (!input.shortName.trim()) return "Indica una sigla di 1–3 lettere.";
  return null;
}

/** Nuovo profilo dall'intervista. I campi derivati si ricalcolano qui, non ci si fida del browser. */
export async function createProfileFromInterview(input: InterviewInput): Promise<ActionResult> {
  const invalid = validateIdentity(input);
  if (invalid) return { error: invalid };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .insert({
      workspace_id: await getWorkspaceId(),
      name: input.name.trim(),
      short_name: input.shortName.trim().toUpperCase().slice(0, 3),
      organization_type: input.organizationType.trim(),
      ...profileFromInterview(input),
    })
    .select("id")
    .single();

  if (error || !data) return { error: "Profilo non salvato: controlla di avere i permessi di modifica." };
  revalidatePath("/profili");
  redirect(`/profili/${data.id}`);
}

/**
 * Intervista rifatta su un profilo esistente: temi, ambiti e parametri dell'intervista
 * vengono aggiornati; i parametri inseriti a mano fuori dall'intervista restano.
 */
export async function updateProfileFromInterview(id: string, input: InterviewInput): Promise<ActionResult> {
  const invalid = validateIdentity(input);
  if (invalid) return { error: invalid };
  const existing = await getProfile(id);
  if (!existing) return { error: "Profilo non trovato." };

  const fromInterview = profileFromInterview(input);
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      name: input.name.trim(),
      short_name: input.shortName.trim().toUpperCase().slice(0, 3),
      organization_type: input.organizationType.trim(),
      ...fromInterview,
      params: { ...existing.profile.params, ...fromInterview.params },
    })
    .eq("id", id);

  if (error) return { error: "Profilo non aggiornato: controlla di avere i permessi di modifica." };
  revalidatePath("/profili");
  redirect(`/profili/${id}`);
}

// ---------------------------------------------------------------------------
// Modifica diretta dalla scheda del profilo
// ---------------------------------------------------------------------------

function parseValue(kind: string, formData: FormData, key: string): unknown {
  if (kind === "multi") return formData.getAll(`p_${key}`).map(String);
  const raw = String(formData.get(`p_${key}`) ?? "").trim();
  if (raw === "") return null;
  if (kind === "number") {
    // Il campo è di tipo numerico: il browser invia sempre il punto come separatore decimale.
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  if (kind === "boolean") return raw === "si" ? true : raw === "no" ? false : null;
  return raw;
}

const lines = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

export async function updateProfile(id: string, formData: FormData) {
  const existing = await getProfile(id);
  if (!existing) redirect("/profili");
  const { profile } = existing;

  const fields = paramFieldsFor(profile.subjectType, profile.interviewAnswers ?? {}, profile.params);
  const now = new Date().toISOString();
  const params: ProfileParams = { ...profile.params };

  for (const f of fields) {
    const value = parseValue(f.kind, formData, f.key);
    const empty = value === null || (Array.isArray(value) && value.length === 0);
    if (empty) {
      delete params[f.key];
      continue;
    }
    const confidence = String(formData.get(`c_${f.key}`) ?? "verificato") as ParamValue<unknown>["confidence"];
    const previous = profile.params[f.key];
    const changed =
      JSON.stringify(previous?.value) !== JSON.stringify(value) || previous?.confidence !== confidence;
    params[f.key] = changed
      ? { value, confidence, source: "Modifica manuale", updatedAt: now }
      : (previous as ParamValue<unknown>);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      name: String(formData.get("name") ?? "").trim() || profile.name,
      short_name: String(formData.get("short_name") ?? "").trim().toUpperCase().slice(0, 3) || profile.shortName,
      organization_type: String(formData.get("organization_type") ?? "").trim(),
      is_template: formData.get("is_template") === "modello",
      notes: String(formData.get("notes") ?? "").trim() || null,
      evidence_ready: lines(formData.get("evidence_ready")),
      evidence_missing: lines(formData.get("evidence_missing")),
      params,
    })
    .eq("id", id);

  revalidatePath("/profili");
  revalidatePath("/opportunita");
  redirect(`/profili/${id}?${error ? "errore=1" : "salvato=1"}`);
}
