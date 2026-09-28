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
  const n = Number(String(v ?? "").trim());
  return String(v ?? "").trim() && Number.isFinite(n) ? n : null;
};

export async function saveAnacFilters(formData: FormData) {
  const cpv = [...new Set([...formData.getAll("cpv").map(String), ...list(formData.get("cpv_altri"))])]
    .map((c) => c.replace(/[^0-9-]/g, ""))
    .filter((c) => c.replace(/-/g, "").length >= 3);
  if (!cpv.length) redirect("/fonti/anac?errore=cpv");

  const filters: AnacFilters = {
    cpv,
    regioni: formData.getAll("regioni").map(String),
    tipologie: formData.getAll("tipologie").map(String),
    importoMin: amount(formData.get("importo_min")),
    importoMax: amount(formData.get("importo_max")),
    escludi: list(formData.get("escludi")),
    soloAperti: formData.get("solo_aperti") === "on",
    giorniIndietro: Math.min(60, Math.max(1, Number(formData.get("giorni_indietro")) || 7)),
  };

  const supabase = await createClient();
  const { error } = await supabase
    .from("connector_settings")
    .upsert({ workspace_id: await getWorkspaceId(), connector: "anac", filters, updated_at: new Date().toISOString() });
  revalidatePath("/fonti/anac");
  redirect(`/fonti/anac?${error ? "errore=salvataggio" : "salvato=1"}`);
}

/** «Controlla ora»: il controllo gira con i permessi dell'utente collegato. */
export async function runAnacNow() {
  const supabase = await createClient();
  let target = "/novita";
  try {
    const summary = await runAnac(supabase, await getWorkspaceId());
    target = `/novita?controllo=${summary.runId}`;
  } catch (e) {
    target = `/fonti/anac?errore=${encodeURIComponent(e instanceof Error ? e.message : "controllo")}`;
  }
  revalidatePath("/novita");
  revalidatePath("/opportunita");
  redirect(target);
}
