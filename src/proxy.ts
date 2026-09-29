import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Pagine raggiungibili senza essere collegati. */
const PUBLIC_PATHS = ["/login", "/auth/", "/api/cron/"];

/**
 * Eseguito prima di ogni pagina: rinnova la sessione di Supabase (che ha una durata
 * limitata) e rimanda al login chi non è collegato.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const configError = checkConfig();
  if (configError) {
    return new NextResponse(`Configurazione di Cercabandi incompleta: ${configError}`, {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    }
  );

  // getClaims verifica la firma del token: non ci si fida del solo cookie.
  const { data } = await supabase.auth.getClaims();
  const isPublic = PUBLIC_PATHS.some((p) => request.nextUrl.pathname.startsWith(p));

  if (!data?.claims && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

/**
 * Controlla che le variabili d'ambiente di Supabase ci siano e abbiano la forma giusta,
 * così un errore di configurazione si capisce subito. Non mostra mai i valori.
 */
function checkConfig(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url) return "manca la variabile NEXT_PUBLIC_SUPABASE_URL.";
  if (!key) return "manca la variabile NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.";
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url.trim())) {
    return "NEXT_PUBLIC_SUPABASE_URL non ha la forma https://<codice>.supabase.co (controlla spazi, virgolette o parti in più).";
  }
  if (url !== url.trim() || key !== key.trim()) {
    return "una delle variabili contiene spazi all'inizio o alla fine.";
  }
  if (key.startsWith("sb_secret_")) {
    return "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY contiene la chiave SEGRETA: sostituiscila subito con la publishable key.";
  }
  return null;
}

export const config = {
  // Escluse le risorse statiche (script, immagini, font), che non richiedono il login.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)"],
};
