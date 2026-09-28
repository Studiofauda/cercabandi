"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/db/queries";
import { runAnac } from "@/lib/ingestion/run";
import type { AnacFilters } from "@/lib/ingestion/anac";

const list = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split(/[\n,;]/)
    .map((s) => s.trim())
    .filter(Boolean);

const amount = (v: FormDataEntryValue | null) => {
  const raw = String(v ?? "").trim();
  const n = Number(raw);
  return raw && Number.isFinite(n) ? n : null;
};

/** Esegue il controllo ANAC per un profilo e porta alle Novità con l'esito. */
async function run(profileId: string): Promise<string> {
  const supabase = await createClient();
  try {
    const summary = await runAnac(supabase, await getWorkspaceId(), profileId);
    revalidatePath("/novita");
    revalidatePath("/opportunita");
    return `/novita?profilo=${profileId}&controllo=${summary.runId}`;
  } catch (e) {
    return `/fonti/anac?profilo=${profileId}&errore=${encodeURIComponent(e instanceof Error ? e.message : "controllo")}`;
  }
}

export async function saveAnacFilters(profileId: string, formData: FormData) {
  const cpv = [...new Set([...formData.getAll("cpv").map(String), ...list(formData.get("cpv_altri"))])]
    .map((c) => c.replace(/[^0-9-]/g, ""))
    .filter((c) => c.replace(/-/g, "").length >= 3);
  if (!cpv.length) redirect(`/fonti/anac?profilo=${profileId}&errore=cpv`);

  const filters: AnacFilters = {
    cpv,
    regioni: formData.getAll("regioni").map(String),
    tipologie: formData.getAll("tipologie").map(String),
    importoMin: amount(formData.get("importo_min")),
    importoMax: amount(formData.get("importo_max")),
    includi: list(formData.get("includi")),
    escludi: list(formData.get("escludi")),
    ricerca: String(formData.get("ricerca") ?? "").trim(),
    soloAperti: formData.get("solo_aperti") === "on",
    giorniIndietro: Math.min(60, Math.max(1, Number(formData.get("giorni_indietro")) || 7)),
  };

  const supabase = await createClient();
  const { error } = await supabase.from("connector_settings").upsert({
    workspace_id: await getWorkspaceId(),
    connector: "anac",
    profile_id: profileId,
    filters,
    updated_at: new Date().toISOString(),
  });
  revalidatePath("/fonti/anac");
  if (error) redirect(`/fonti/anac?profilo=${profileId}&errore=salvataggio`);

  if (formData.get("intent") === "controlla") redirect(await run(profileId));
  redirect(`/fonti/anac?profilo=${profileId}&salvato=1`);
}

/** «Controlla ora» con i filtri già salvati: gira con i permessi dell'utente collegato. */
export async function runAnacNow(profileId: string) {
  redirect(await run(profileId));
}
