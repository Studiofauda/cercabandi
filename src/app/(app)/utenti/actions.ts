"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/queries";

/*
 * Gestione delle persone che accedono a Cercabandi.
 *
 * - Creare l'account richiede la chiave segreta (solo sul server): gli account non si
 *   possono registrare da soli.
 * - Aggiungere, cambiare ruolo o togliere un membro passa invece dalle regole di accesso
 *   del database: ci riesce solo un amministratore.
 */

const ROLES = ["admin", "editor", "viewer"] as const;

async function currentRole(): Promise<{ userId: string; role: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase.from("workspace_members").select("role").eq("user_id", user.id).maybeSingle();
  return { userId: user.id, role: (data?.role as string | undefined) ?? null };
}

export async function addMember(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "editor");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) redirect("/utenti?errore=email");
  if (!ROLES.includes(role as (typeof ROLES)[number])) redirect("/utenti?errore=ruolo");
  if ((await currentRole()).role !== "admin") redirect("/utenti?errore=permessi");

  // 1. Account: si crea se non esiste (senza email di invito: la persona entra dalla pagina
  //    di login con il link che riceve). Se esiste già, lo si ritrova.
  let userId: string | undefined;
  try {
    const admin = createAdminClient();
    const created = await admin.auth.admin.createUser({ email, email_confirm: true });
    userId = created.data.user?.id;
    if (!userId) {
      // Esiste già: lo si cerca nell'elenco degli account.
      for (let page = 1; page <= 20 && !userId; page++) {
        const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        userId = data.users.find((u) => u.email?.toLowerCase() === email)?.id;
        if (data.users.length < 200) break;
      }
    }
  } catch {
    redirect("/utenti?errore=account");
  }
  if (!userId) redirect("/utenti?errore=account");

  // 2. Membro dello spazio di lavoro, con il ruolo scelto (regole di accesso: solo admin).
  const supabase = await createClient();
  const { error } = await supabase
    .from("workspace_members")
    .upsert({ workspace_id: await getWorkspaceId(), user_id: userId, role }, { onConflict: "workspace_id,user_id" });
  if (error) redirect("/utenti?errore=membro");

  revalidatePath("/utenti");
  redirect(`/utenti?aggiunto=${encodeURIComponent(email)}`);
}

export type LoginLinkState = { link?: string; email?: string; error?: string };

/**
 * Link di accesso personale, da mandare a mano (nessuna email automatica). Il codice è
 * monouso e scade secondo l'impostazione «Email OTP Expiration» di Supabase.
 * Il link non passa mai dall'indirizzo della pagina: si mostra solo a chi l'ha generato.
 */
export async function generateLoginLink(userId: string, _prev: LoginLinkState): Promise<LoginLinkState> {
  if ((await currentRole()).role !== "admin") return { error: "Solo un amministratore può generare link di accesso." };
  try {
    const admin = createAdminClient();
    const { data: found } = await admin.auth.admin.getUserById(userId);
    const email = found.user?.email;
    if (!email) return { error: "Account non trovato." };
    const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    const token = data.properties?.hashed_token;
    if (error || !token) return { error: "Link non generato: riprova." };
    const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
    return { email, link: `${origin}/auth/confirm?token_hash=${encodeURIComponent(token)}&type=email` };
  } catch {
    return { error: "Link non generato: controlla che la chiave segreta di Supabase sia configurata su Vercel." };
  }
}

export async function changeRole(userId: string, formData: FormData) {
  const role = String(formData.get("role") ?? "");
  if (!ROLES.includes(role as (typeof ROLES)[number])) redirect("/utenti?errore=ruolo");
  const me = await currentRole();
  if (me.role !== "admin") redirect("/utenti?errore=permessi");
  if (userId === me.userId && role !== "admin") redirect("/utenti?errore=ultimo-admin");

  const supabase = await createClient();
  const { error } = await supabase.from("workspace_members").update({ role }).eq("user_id", userId).eq("workspace_id", await getWorkspaceId());
  if (error) redirect("/utenti?errore=membro");
  revalidatePath("/utenti");
  redirect("/utenti");
}

export async function removeMember(userId: string) {
  const me = await currentRole();
  if (me.role !== "admin") redirect("/utenti?errore=permessi");
  if (userId === me.userId) redirect("/utenti?errore=ultimo-admin");

  // Si toglie l'accesso allo spazio di lavoro; l'account resta, senza accesso ai dati.
  const supabase = await createClient();
  const { error } = await supabase.from("workspace_members").delete().eq("user_id", userId).eq("workspace_id", await getWorkspaceId());
  if (error) redirect("/utenti?errore=membro");
  revalidatePath("/utenti");
  redirect("/utenti");
}
