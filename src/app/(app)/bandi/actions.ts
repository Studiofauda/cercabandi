"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/db/queries";

/*
 * Inserimento e modifica dei bandi a mano. Ogni modifica a un bando esistente lascia una
 * revisione nello storico (campo, valore precedente, valore nuovo), come fanno i lettori
 * automatici: così si vede sempre chi ha cambiato cosa rispetto alla fonte.
 */

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const num = (fd: FormData, k: string) => {
  const v = str(fd, k);
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const dateOrNull = (fd: FormData, k: string) => str(fd, k) || null;
const bool3 = (fd: FormData, k: string) => (str(fd, k) === "si" ? true : str(fd, k) === "no" ? false : null);

function rowFromForm(fd: FormData) {
  return {
    title: str(fd, "title"),
    authority: str(fd, "authority"),
    external_code: str(fd, "external_code") || null,
    level: str(fd, "level"),
    status: str(fd, "status"),
    kind: str(fd, "kind") || "contributo",
    theme: str(fd, "theme"),
    territory: str(fd, "territory"),
    eligible_subject_types: fd.getAll("eligible").map(String),
    packs: fd.getAll("packs").map(String),
    funding_source: str(fd, "funding_source") || null,
    budget_totale: num(fd, "budget_totale"),
    contributo_max: num(fd, "contributo_max"),
    cofinanziamento_richiesto_pct: num(fd, "cofin_pct"),
    abitanti_min: num(fd, "abitanti_min"),
    abitanti_max: num(fd, "abitanti_max"),
    deadline: dateOrNull(fd, "deadline"),
    expected_publication: dateOrNull(fd, "expected_publication"),
    replicabile: fd.get("replicabile") === "on",
    cumulabile: bool3(fd, "cumulabile"),
    source_id: str(fd, "source_id") || null,
    source_url: str(fd, "source_url"),
    needs_review: fd.get("needs_review") === "on",
    review_notes: str(fd, "review_notes") || null,
  };
}

function validate(row: ReturnType<typeof rowFromForm>): string | null {
  if (!row.title) return "titolo";
  if (!["Europeo", "Nazionale", "Regionale", "Locale"].includes(row.level)) return "livello";
  if (!["Aperto", "In arrivo", "Chiuso"].includes(row.status)) return "stato";
  if (!row.eligible_subject_types.length) return "soggetti";
  if (row.cofinanziamento_richiesto_pct !== null && (row.cofinanziamento_richiesto_pct < 0 || row.cofinanziamento_richiesto_pct > 100)) return "cofinanziamento";
  if (row.abitanti_min !== null && row.abitanti_max !== null && row.abitanti_min > row.abitanti_max) return "abitanti";
  return null;
}

/** Ritorno dopo il salvataggio: solo percorsi interni al sito. */
const backTo = (fd: FormData, fallback: string) => {
  const b = str(fd, "back");
  return b.startsWith("/") && !b.startsWith("//") ? b : fallback;
};

export async function createOpportunity(formData: FormData) {
  const row = rowFromForm(formData);
  const invalid = validate(row);
  if (invalid) redirect(`/bandi/nuovo?errore=${invalid}`);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("opportunities")
    .insert({ ...row, workspace_id: await getWorkspaceId(), origin: "manuale", verified_at: new Date().toISOString() })
    .select("id")
    .single();
  if (error || !data) redirect(`/bandi/nuovo?errore=${encodeURIComponent(error?.message ?? "salvataggio")}`);
  revalidatePath("/opportunita");
  redirect(`/opportunita?bando=${data.id}`);
}

export async function updateOpportunity(id: string, formData: FormData) {
  const row = rowFromForm(formData);
  const invalid = validate(row);
  if (invalid) redirect(`/bandi/${id}/modifica?errore=${invalid}`);

  const supabase = await createClient();
  const { data: prev } = await supabase.from("opportunities").select("*").eq("id", id).single();
  if (!prev) redirect("/opportunita");

  const changes = (Object.keys(row) as Array<keyof typeof row>)
    .filter((k) => JSON.stringify(prev[k] ?? null) !== JSON.stringify(row[k] ?? null) && String(prev[k] ?? "") !== String(row[k] ?? ""))
    .map((k) => ({ field: k, previous: prev[k], current: row[k] }));

  if (changes.length) {
    const { error } = await supabase.from("opportunities").update({ ...row, verified_at: new Date().toISOString() }).eq("id", id);
    if (error) redirect(`/bandi/${id}/modifica?errore=${encodeURIComponent(error.message)}`);
    await supabase.from("opportunity_revisions").insert({
      workspace_id: prev.workspace_id,
      opportunity_id: id,
      changes: changes.map((c) => ({ ...c, by: "modifica manuale" })),
      snapshot: prev,
    });
  }
  revalidatePath("/opportunita");
  redirect(backTo(formData, `/opportunita?bando=${id}`));
}
