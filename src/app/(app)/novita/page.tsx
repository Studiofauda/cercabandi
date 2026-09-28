import Link from "next/link";
import { DIGEST_THRESHOLD, evaluate } from "@/core/scoring";
import { getDismissals, getLatestRuns, getOpportunities, getProfiles, getRun } from "@/lib/db/queries";
import { date, dateTime } from "@/lib/format";
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
  const [profiles, opportunities] = await Promise.all([getProfiles(), getOpportunities()]);
  const profile = profiles.find((p) => p.profile.id === profilo)?.profile ?? profiles[0]?.profile;
  if (!profile) return <p className="text-muted">Serve almeno un profilo.</p>;
  const [latest, requested] = await Promise.all([getLatestRuns(profile.id, 1), controllo ? getRun(controllo) : Promise.resolve(null)]);

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
  const lastRun = requested ?? latest[0];
  const sourceName = (c?: string) => ORIGIN_LABEL[c ?? ""] ?? "fonte";
  const base = (p: string) => `/novita?profilo=${p}&giorni=${days}`;

  return (
    <div className="mx-auto max-w-4xl">
      <ProfileChips profiles={profiles.map((p) => p.profile)} activeId={profile.id} hrefFor={base} />

      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-[21px] font-bold tracking-[-0.01em]">Novità</h1>
        <span className="flex gap-2">
          <Link href={`/fonti/anac?profilo=${profile.id}`} className="rounded-control bg-ink px-3 py-1.5 text-xs font-semibold text-lime">
            Ricerca ANAC →
          </Link>
          <Link href={`/fonti/sedia?profilo=${profile.id}`} className="rounded-control bg-ink px-3 py-1.5 text-xs font-semibold text-lime">
            Ricerca bandi UE →
          </Link>
        </span>
      </div>
      <p className="mt-1 text-xs text-muted">
        Bandi trovati dai controlli automatici negli ultimi {days} giorni · {fresh.length} pertinenti per{" "}
        <strong className="text-ink">{profile.name}</strong>, di cui <strong className="text-ink">{aboveThreshold}</strong> sopra la soglia di {DIGEST_THRESHOLD}.
      </p>

      {controllo && lastRun && lastRun.id === controllo && (
        <div role="status" className={`mt-3 rounded-card border-2 px-4 py-3 text-[13px] ${lastRun.status === "completato" ? "border-green bg-go/15" : "border-red bg-nogo/10"}`}>
          <p className="font-bold">
            {lastRun.status === "completato" ? `✓ Controllo ${sourceName(lastRun.connector)} eseguito` : `✗ Controllo ${sourceName(lastRun.connector)} non riuscito`} per {profile.name} · {dateTime(lastRun.started_at)}
          </p>
          {lastRun.status === "completato" ? (
            <>
              <p className="mt-1">
                Letti <strong>{lastRun.found}</strong> {lastRun.window_from ? `avvisi pubblicati dal ${date(lastRun.window_from)} al ${date(lastRun.window_to)}` : "bandi aperti o in arrivo"}:{" "}
                <strong>{lastRun.inserted} bandi nuovi</strong>, {lastRun.updated} aggiornati, {lastRun.skipped} già presenti.
              </p>
              {lastRun.message && <p className="mt-0.5 text-xs text-muted">{lastRun.message}.</p>}
              {lastRun.inserted + lastRun.updated === 0 && (
                <p className="mt-1 text-xs">
                  Nessun bando nuovo con questi filtri nel periodo. Puoi allargarli (più regioni, più giorni, meno parole chiave) da{" "}
                  <Link href={`/fonti/${lastRun.connector}?profilo=${profile.id}`} className="underline">
                    Fonti → {sourceName(lastRun.connector)}
                  </Link>
                  .
                </p>
              )}
            </>
          ) : (
            <p className="mt-1 text-xs">{lastRun.message}</p>
          )}
        </div>
      )}
      {!controllo && lastRun && (
        <p className="mt-2 text-[11px] text-muted">
          Ultimo controllo per {profile.name}: {sourceName(lastRun.connector)}, {dateTime(lastRun.started_at)}, {lastRun.triggered_by ? "manuale" : "automatico"} ({lastRun.status}, {lastRun.inserted} nuovi).
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
          <Link href={`/fonti/anac?profilo=${profile.id}`} className="underline">
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
