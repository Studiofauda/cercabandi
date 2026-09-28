import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Pagina di arrivo del link ricevuto via email: trasforma il codice in una sessione. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/opportunita`);
  }

  // Link scaduto, già usato o aperto da un altro browser.
  return NextResponse.redirect(`${origin}/login?errore=link`);
}
