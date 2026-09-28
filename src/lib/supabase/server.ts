import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Client Supabase per il codice che gira sul server (pagine, azioni, route).
 * Va creato a ogni richiesta: legge la sessione dell'utente dai cookie.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Le pagine non possono scrivere cookie: il rinnovo della sessione
            // avviene comunque nel proxy, a ogni richiesta.
          }
        },
      },
    }
  );
}
