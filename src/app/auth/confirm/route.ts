import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Arrivo dai link di accesso generati dall'amministratore (pagina Utenti).
 *
 * Il codice del link vale una sola volta. Molti programmi di posta aziendali aprono da soli
 * i link per controllarli: se l'accesso avvenisse all'apertura, il link risulterebbe già
 * usato quando il collega lo clicca. Per questo l'apertura mostra solo un bottone, e
 * l'accesso avviene quando lo si preme (richiesta POST, che i controlli non inviano).
 */

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash") ?? "";
  const type = request.nextUrl.searchParams.get("type") ?? "email";
  const html = `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Accesso a Cercabandi</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0f0f12;font-family:system-ui,sans-serif;color:#0f0f12}
  .card{background:#fff;border-radius:10px;padding:28px 24px;max-width:360px;width:calc(100% - 32px)}
  h1{margin:0;font-size:26px;font-weight:900;letter-spacing:-.02em}
  p{color:#6b6b73;font-size:14px;line-height:1.45}
  button{width:100%;border:0;border-radius:8px;background:#0f0f12;color:#d4ff3d;font-weight:700;font-size:15px;padding:12px;cursor:pointer}
</style></head>
<body><main class="card">
  <h1>cercabandi</h1>
  <p>Premi il bottone per entrare con il link personale che hai ricevuto.</p>
  <form method="post">
    <input type="hidden" name="token_hash" value="${escape(tokenHash)}">
    <input type="hidden" name="type" value="${escape(type)}">
    <button type="submit">Entra in Cercabandi</button>
  </form>
</main></body></html>`;
  return new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const tokenHash = String(form.get("token_hash") ?? "");
  const type = String(form.get("type") ?? "email") as EmailOtpType;
  const origin = request.nextUrl.origin;

  if (tokenHash) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(`${origin}/novita`, { status: 303 });
  }
  // Link scaduto o già usato.
  return NextResponse.redirect(`${origin}/login?errore=link`, { status: 303 });
}
