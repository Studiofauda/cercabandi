"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/db/queries";
import { runFeed } from "@/lib/ingestion/run";
import type { FeedFilters } from "@/lib/ingestion/feeds";

const list = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split(/[\n,;]/)
    .map((s) => s.trim())
    .filter(Boolean);

async function run(profileId: string): Promise<string> {
  const supabase = await createClient();
  try {
    const summary = await runFeed(supabase, await getWorkspaceId(), profileId);
    revalidatePath("/novita");
    revalidatePath("/opportunita");
    return `/novita?profilo=${profileId}&controllo=${summary.runId}`;
  } catch (e) {
    return `/fonti/feed?profilo=${profileId}&errore=${encodeURIComponent(e instanceof Error ? e.message : "controllo")}`;
  }
}

export async function saveFeedFilters(profileId: string, formData: FormData) {
  const filters: FeedFilters = {
    fonti: formData.getAll("fonti").map(String),
    includi: list(formData.get("includi")),
    escludi: list(formData.get("escludi")),
    soloAperti: formData.get("solo_aperti") === "on",
    ricerca: String(formData.get("ricerca") ?? "").trim(),
  };
  if (!filters.fonti.length) redirect(`/fonti/feed?profilo=${profileId}&errore=fonti`);

  const supabase = await createClient();
  const { error } = await supabase.from("connector_settings").upsert({
    workspace_id: await getWorkspaceId(),
    connector: "feed",
    profile_id: profileId,
    filters,
    updated_at: new Date().toISOString(),
  });
  revalidatePath("/fonti/feed");
  if (error) redirect(`/fonti/feed?profilo=${profileId}&errore=salvataggio`);
  if (formData.get("intent") === "controlla") redirect(await run(profileId));
  redirect(`/fonti/feed?profilo=${profileId}&salvato=1`);
}

export async function runFeedNow(profileId: string) {
  redirect(await run(profileId));
}
