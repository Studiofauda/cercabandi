import Link from "next/link";
import { evaluate } from "@/core/scoring";
import type { Evaluation, Opportunity } from "@/core/types";
import { DEMO_OPPORTUNITIES, DEMO_PROFILES } from "@/lib/demo";
import { Pill, VERDICT_TONE, type Tone } from "@/components/Pill";
import { ScoreRange } from "@/components/ScoreRange";

const STATUS_TONE: Record<Opportunity["status"], Tone> = {
  Aperto: "go",
  "In arrivo": "investigate",
  Chiuso: "closed",
};

function daysUntil(date: string, now: Date): number {
  return Math.ceil((new Date(date).getTime() - now.getTime()) / 86_400_000);
}

export default async function OpportunitaPage({
  searchParams,
}: {
  searchParams: Promise<{ profilo?: string }>;
}) {
  const { profilo } = await searchParams;
  const profile = DEMO_PROFILES.find((p) => p.id === profilo) ?? DEMO_PROFILES[0];
  const now = new Date();

  const rows = DEMO_OPPORTUNITIES.map((o) => ({ o, e: evaluate(profile, o, now) }))
    .filter(({ e }) => e.verdict !== "Non applicabile")
    .sort((a, b) => b.e.score - a.e.score);

  return (
    <div className="mx-auto max-w-4xl">
      <ProfileChips activeId={profile.id} />

      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-[21px] font-bold tracking-[-0.01em]">Opportunità</h1>
        <p className="text-xs text-muted">
          Punteggio e verdetto calcolati per <strong className="text-ink">{profile.name}</strong> · {rows.length} opportunità
        </p>
      </div>

      <div className="mt-2 rounded-control border border-dashed border-line bg-panel px-3 py-2 text-xs text-muted">
        Anteprima con dati di esempio: il collegamento al database arriva nei prossimi passi.
      </div>

      <ul className="mt-4 flex flex-col gap-2.5">
        {rows.map(({ o, e }) => (
          <OpportunityCard key={o.id} opportunity={o} evaluation={e} now={now} />
        ))}
      </ul>
    </div>
  );
}

function ProfileChips({ activeId }: { activeId: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {DEMO_PROFILES.map((p) => {
        const active = p.id === activeId;
        return (
          <Link
            key={p.id}
            href={`/opportunita?profilo=${p.id}`}
            className={`flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-[13px] font-semibold ${
              active ? "border-ink bg-ink text-paper" : "border-line bg-paper hover:border-ink"
            }`}
          >
            <span
              className={`grid size-6 place-items-center rounded-full text-[10.5px] font-bold ${
                active ? "bg-lime text-ink" : "bg-panel"
              }`}
            >
              {p.shortName}
            </span>
            {p.name}
          </Link>
        );
      })}
    </div>
  );
}

function OpportunityCard({
  opportunity: o,
  evaluation: e,
  now,
}: {
  opportunity: Opportunity;
  evaluation: Evaluation;
  now: Date;
}) {
  const days = o.deadline ? daysUntil(o.deadline, now) : null;
  const urgencyTone: Tone | null = days === null ? null : days <= 15 ? "nogo" : days <= 30 ? "cond" : null;
  const blockingEligibility = e.breakdown.find((b) => b.eligibility && b.score === 0 && b.weight > 0);

  return (
    <li className="flex gap-4 rounded-card border border-line bg-paper px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap gap-1.5">
          <Pill>{o.level}</Pill>
          <Pill tone={STATUS_TONE[o.status]}>{o.status}</Pill>
          {days !== null && (
            <Pill tone={urgencyTone ?? "neutral"}>Scade tra {days} giorni</Pill>
          )}
        </div>
        <h2 className="mt-2 text-[16.5px] leading-snug font-bold tracking-[-0.01em]">{o.title}</h2>
        <p className="mt-0.5 text-xs text-muted">
          {o.authority} · {o.territory}
        </p>

        {blockingEligibility && (
          <p className="mt-2 text-[13px] font-semibold text-red">Non ammissibile: {blockingEligibility.note}</p>
        )}

        {e.uncertainParams.length > 0 && (
          <p className="mt-2 text-xs text-warning-text">
            Da completare o verificare:{" "}
            {e.uncertainParams.map((p) => `${p.label} (${p.status})`).join(", ")}
          </p>
        )}
      </div>

      <div className="flex flex-col items-end gap-2">
        <Pill tone={VERDICT_TONE[e.verdict]} size="md">
          {e.verdict}
        </Pill>
        <ScoreRange evaluation={e} />
      </div>
    </li>
  );
}
