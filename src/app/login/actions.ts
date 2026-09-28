"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { status: "idle" | "sent" | "error"; message?: string };

/**
 * Invia il link di accesso via email. Gli account si creano solo su invito:
 * `shouldCreateUser: false` impedisce che un indirizzo sconosciuto generi un nuovo utente.
 */
export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email.includes("@")) {
    return { status: "error", message: "Inserisci un indirizzo email valido." };
  }

  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return {
      status: "error",
      message: "Non è stato possibile inviare il link. Verifica che l'indirizzo sia tra quelli invitati, oppure riprova tra qualche minuto.",
    };
  }
  return { status: "sent", message: email };
}
