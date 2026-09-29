import Link from "next/link";
import { DIGEST_THRESHOLD, evaluate } from "@/core/scoring";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDismissals, getOpportunities, getProfiles } from "@/lib/db/queries";
import { date } from "@/lib/format";
import { Pill, VERDICT_TONE } from "@/components/Pill";
import { CopyDigest } from "./CopyDigest";

/**
 * Riepilogo settimanale (il «digest» dei requisiti): per ogni profilo, i bandi entrati in
 * Cercabandi nel periodo con punteggio almeno pari alla soglia, esclusi scartati e chiusi.
 * Nessuna email automatica: il testo si copia o si apre nel programma di posta.
 */
export default async function RiepilogoPage({ searchParams }: { searchParams: Promise<{ giorni?: string }> }) {
  const { giorni } = await searchParams;
  const days = Math.min(31, Math.max(1, Number(giorni) || 7));
  const since = Date.now() - days * 86_400_000;
  const now = new Date();
  const [profiles, opportunities] = await Promise.all([getProfiles(), getOpportunities()]);

  const sections = [];
  for (const { profile } of profiles) {
    const dismissed = await getDismissals(profile.id);
    const items = opportunities
      .filter(({ opportunity: o, row }) => new Date(row.created_at).getTime() >= since && o.status !== "Chiuso" && !dismissed.has(o.id))
      .map(({ opportunity: o }) => ({ o, e: evaluate(profile, o, now) }))
      .filter(({ e }) => e.verdict !== "Non applicabile" && e.verdict !== "NO-GO" && e.score >= DIGEST_THRESHOLD)
      .sort((a, b) => b.e.score - a.e.score);
    sections.push({ profile, items });
  }

  // Destinatari: le persone che usano Cercabandi (email leggibili con la chiave segreta).
  const to: string[] = [];
  try {
    const supabase = await createClient();
    const { data: members } = await supabase.from("workspace_members").select("user_id");
    const admin = createAdminClient();
    for (const m of members ?? []) {
      const { data } = await admin.auth.admin.getUserById(m.user_id);
      if (data.user?.email) to.push(data.user.email);
    }
  } catch {
    // Senza chiave segreta il messaggio si apre senza destinatari.
  }

  const period = `dal ${date(new Date(since).toISOString())} al ${date(now.toISOString())}`;
  const total = sections.reduce((s, x) => s + x.items.length, 0);
  const text = [
    `Cercabandi · riepilogo ${period}`,
    `Bandi nuovi con punteggio di almeno ${DIGEST_THRESHOLD}: ${total}.`,
    "",
    ...sections.flatMap(({ profile, items }) =>
      items.length
        ? [
            `▶ ${profile.name} (${items.length})`,
            ...items.map(
              ({ o, e }) =>
                `  • ${o.title}\n    ${e.score}/100 · ${e.verdict} · ${o.authority}${o.deadline ? ` · scade il ${date(o.deadline)}` : ""}\n    ${o.sourceUrl}`
            ),
            "",
          ]
        : []
    ),
    "Dettaglio, punteggi e note in Cercabandi.",
  ].join("\n");

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-[21px] font-bold tracking-[-0.01em]">Riepilogo</h1>
        <div className="flex gap-2 text-xs">
          {[7, 14, 30].map((d) => (
            <Link key={d} href={`/riepilogo?giorni=${d}`} className={`rounded-full border px-2.5 py-0.5 ${d === days ? "border-ink bg-ink text-paper" : "border-line"}`}>
              {d} giorni
            </Link>
          ))}
        </div>
      </div>
      <p className="mt-1 text-xs text-muted">
        Bandi entrati in Cercabandi {period} con punteggio di almeno <strong className="text-ink">{DIGEST_THRESHOLD}</strong>, per ogni profilo. Esclusi scartati, chiusi e
        NO-GO.
      </p>

      <section className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-card border-2 border-ink px-4 py-3">
        <div className="text-[13px]">
          <strong>{total}</strong> bandi da segnalare · {to.length ? `${to.length} destinatari: ${to.join(", ")}` : "destinatari non disponibili"}
        </div>
        <CopyDigest text={text} subject={`Cercabandi · bandi della settimana (${total})`} to={to} />
      </section>

      {sections.map(({ profile, items }) => (
        <section key={profile.id} className="mt-6">
          <h2 className="border-b border-line pb-1.5 text-[15px] font-bold">
            {profile.name} <span className="text-xs font-normal text-muted">· {items.length} bandi</span>
          </h2>
          {items.length === 0 ? (
            <p className="mt-2 text-xs text-muted">Nessun bando nuovo sopra la soglia per questo profilo.</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1.5">
              {items.map(({ o, e }) => (
                <li key={o.id} className="flex flex-wrap items-center gap-2 text-[13px]">
                  <Pill tone={VERDICT_TONE[e.verdict]}>{e.score}</Pill>
                  <Link href={`/opportunita?profilo=${profile.id}&bando=${o.id}`} className="font-semibold hover:underline">
                    {o.title}
                  </Link>
                  <span className="text-xs text-muted">
                    {o.authority}
                    {o.deadline ? ` · scade il ${date(o.deadline)}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <details className="mt-8 rounded-control bg-panel px-3 py-2 text-xs">
        <summary className="cursor-pointer font-semibold">Anteprima del testo dell&apos;email</summary>
        <pre className="mt-2 whitespace-pre-wrap font-sans">{text}</pre>
      </details>
    </div>
  );
}
