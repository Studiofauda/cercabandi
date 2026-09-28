import Link from "next/link";
import { DIGEST_THRESHOLD, evaluate } from "@/core/scoring";
import { getDismissals, getOpportunities, getProfiles, getRuns } from "@/lib/db/queries";
import { date } from "@/lib/format";
import { OpportunityCard, ProfileChips } from "@/components/OpportunityCard";

const ORIGIN_LABEL: Record<string, string> = { anac: "ANAC", ted: "TED", sedia: "Funding & Tenders" };

/**
 * Bandi trovati dai controlli automatici negli ultimi giorni, valutati sul profilo scelto.
 * In evidenza quelli sopra la soglia del digest.
 */
export default async function NovitaPage({
  searchParams,
}: {
  searchParams: Promise<{ profilo?: string; giorni?: string; controllo?: string }>;
}) {
  const { profilo, giorni, controllo } = await searchParams;
  const days = Math.min(90, Math.max(1, Number(giorni) || 14));
  const [profiles, opportunities, runs] = await Promise.all([getProfiles(), getOpportunities(), getRuns("anac", 1)]);
  const profile = profiles.find((p) => p.profile.id === profilo)?.profile ?? profiles[0]?.profile;
  if (!profile) return <p className="text-muted">Serve almeno un profilo.</p>;

  const since = Date.now() - days * 86_400_000;
  const now = new Date();
  const dismissals = await getDismissals(profile.id);
  const fresh = opportunities
    .filter(({ row }) => row.origin !== undefined && !["manuale", "prototipo"].includes(row.origin))
    .filter(({ row }) => new Date(row.created_at).getTime() >= since)
    .map(({ opportunity, row }) => ({ o: opportunity, row, e: evaluate(profile, opportunity, now) }))
    .filter(({ e }) => e.verdict !== "Non applicabile")
    .sort((a, b) => b.e.score - a.e.score);
  const aboveThreshold = fresh.filter(({ e }) => e.score >= DIGEST_THRESHOLD).length;
  const lastRun = runs[0];
  const base = (p: string) => `/novita?profilo=${p}&giorni=${days}`;

  return (
    <div className="mx-auto max-w-4xl">
      <ProfileChips profiles={profiles.map((p) => p.profile)} activeId={profile.id} hrefFor={base} />

      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-[21px] font-bold tracking-[-0.01em]">Novità</h1>
        <Link href="/fonti/anac" className="text-xs underline">
          Filtri e controllo delle fonti
        </Link>
      </div>
      <p className="mt-1 text-xs text-muted">
        Bandi trovati dai controlli automatici negli ultimi {days} giorni · {fresh.length} pertinenti per{" "}
        <strong className="text-ink">{profile.name}</strong>, di cui <strong className="text-ink">{aboveThreshold}</strong> sopra la soglia di {DIGEST_THRESHOLD}.
      </p>

      {controllo && lastRun && lastRun.id === controllo && (
        <p className="mt-3 rounded-control bg-go/20 px-3 py-2 text-xs text-go-ink">
          Controllo ANAC completato: letti {lastRun.found} avvisi, {lastRun.inserted} bandi nuovi, {lastRun.updated} aggiornati.
          {lastRun.message ? ` ${lastRun.message}.` : ""}
        </p>
      )}
      {!controllo && lastRun && (
        <p className="mt-2 text-[11px] text-muted">
          Ultimo controllo ANAC: {date(lastRun.started_at)} ({lastRun.status}).
        </p>
      )}

      <div className="mt-2 flex gap-2 text-xs">
        {[7, 14, 30].map((d) => (
          <Link key={d} href={`/novita?profilo=${profile.id}&giorni=${d}`} className={`rounded-full border px-2.5 py-0.5 ${d === days ? "border-ink bg-ink text-paper" : "border-line"}`}>
            {d} giorni
          </Link>
        ))}
      </div>

      {fresh.length === 0 ? (
        <p className="mt-6 text-muted">
          Nessun bando nuovo in questo periodo. Puoi lanciare un controllo da{" "}
          <Link href="/fonti/anac" className="underline">
            Fonti → ANAC
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2.5">
          {fresh.map(({ o, row, e }) => (
            <li key={o.id}>
              <p className="mb-1 text-[11px] text-muted">
                {ORIGIN_LABEL[row.origin ?? ""] ?? "Fonte"} · trovato il {date(row.created_at)}
              </p>
              <OpportunityCard
                opportunity={o}
                row={row}
                evaluation={e}
                dismissed={dismissals.has(o.id)}
                href={`/opportunita?profilo=${profile.id}&bando=${o.id}`}
                now={now}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
