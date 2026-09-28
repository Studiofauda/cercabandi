"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/db/queries";
import { runSedia } from "@/lib/ingestion/run";
import type { SediaFilters } from "@/lib/ingestion/sedia";

const list = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split(/[\n,;]/)
    .map((s) => s.trim())
    .filter(Boolean);

async function run(profileId: string): Promise<string> {
  const supabase = await createClient();
  try {
    const summary = await runSedia(supabase, await getWorkspaceId(), profileId);
    revalidatePath("/novita");
    revalidatePath("/opportunita");
    return `/novita?profilo=${profileId}&controllo=${summary.runId}`;
  } catch (e) {
    return `/fonti/sedia?profilo=${profileId}&errore=${encodeURIComponent(e instanceof Error ? e.message : "controllo")}`;
  }
}

export async function saveSediaFilters(profileId: string, formData: FormData) {
  const budget = String(formData.get("budget_min") ?? "").trim();
  const filters: SediaFilters = {
    programmi: formData.getAll("programmi").map(String),
    includi: list(formData.get("includi")),
    escludi: list(formData.get("escludi")),
    inArrivo: formData.get("in_arrivo") === "on",
    cascata: formData.get("cascata") === "on",
    budgetMin: budget && Number.isFinite(Number(budget)) ? Number(budget) : null,
    ricerca: String(formData.get("ricerca") ?? "").trim(),
  };

  const supabase = await createClient();
  const { error } = await supabase.from("connector_settings").upsert({
    workspace_id: await getWorkspaceId(),
    connector: "sedia",
    profile_id: profileId,
    filters,
    updated_at: new Date().toISOString(),
  });
  revalidatePath("/fonti/sedia");
  if (error) redirect(`/fonti/sedia?profilo=${profileId}&errore=salvataggio`);
  if (formData.get("intent") === "controlla") redirect(await run(profileId));
  redirect(`/fonti/sedia?profilo=${profileId}&salvato=1`);
}

export async function runSediaNow(profileId: string) {
  redirect(await run(profileId));
}
