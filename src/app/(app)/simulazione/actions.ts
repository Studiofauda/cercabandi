"use server";

import { revalidatePath } from "next/cache";
import type { ProfileParams } from "@/core/types";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/db/queries";

export async function saveScenario(input: {
  profileId: string;
  opportunityId: string;
  label: string;
  params: Partial<ProfileParams>;
}): Promise<{ id?: string; error?: string }> {
  if (!input.label.trim()) return { error: "Dai un nome alla variante." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scenarios")
    .insert({
      workspace_id: await getWorkspaceId(),
      profile_id: input.profileId,
      opportunity_id: input.opportunityId,
      label: input.label.trim(),
      params: input.params,
    })
    .select("id")
    .single();
  if (error || !data) return { error: "Variante non salvata: controlla di avere i permessi di modifica." };
  revalidatePath("/simulazione");
  return { id: data.id };
}

export async function deleteScenario(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("scenarios").delete().eq("id", id);
  if (error) return { error: "Variante non eliminata: controlla di avere i permessi di modifica." };
  revalidatePath("/simulazione");
  return {};
}
