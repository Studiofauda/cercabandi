"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Feedback rapido sull'utilità di una fonte (requisiti v3): sostituisce una verifica
 * formale periodica con il giudizio di chi la usa davvero.
 */
export async function sourceFeedback(formData: FormData) {
  const id = String(formData.get("sourceId") ?? "");
  const useful = formData.get("useful") === "1";
  const column = useful ? "feedback_useful" : "feedback_not_useful";

  const supabase = await createClient();
  const { data } = await supabase.from("sources").select(column).eq("id", id).single();
  if (data) {
    const current = (data as Record<string, number>)[column] ?? 0;
    await supabase.from("sources").update({ [column]: current + 1 }).eq("id", id);
  }
  revalidatePath("/fonti");
}
