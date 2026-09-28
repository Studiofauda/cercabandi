import Link from "next/link";
import { evaluate } from "@/core/scoring";
import type { Evaluation, Opportunity, Profile } from "@/core/types";
import { getOpportunities, getProfiles } from "@/lib/db/queries";
import type { OpportunityRow } from "@/lib/db/mappers";
import { Pill, VERDICT_TONE, type Tone } from "@/components/Pill";
import { ScoreRange } from "@/components/ScoreRange";

const STATUS_TONE: Record<Opportunity["status"], Tone> = {
  Aperto: "go",
  "In arrivo": "investigate",
  Chiuso: "closed",
};

/** Prima i bandi utilizzabili, poi quelli chiusi; a parità, il punteggio più alto. */
const STATUS_ORDER: Record<Opportunity["status"], number> = { Aperto: 0, "In arrivo": 1, Chiuso: 2 };

function daysUntil(date: string, now: Date): number {
  return Math.ceil((new Date(date).getTime() - now.getTime()) / 86_400_000);
}

export default async function OpportunitaPage({
  searchParams,
}: {
  searchParams: Promise<{ profilo?: string; tutti?: string }>;
}) {
  const { profilo, tutti } = await searchParams;
  const [profiles, opportunities] = await Promise.all([getProfiles(), getOpportunities()]);

  if (profiles.length === 0) {
    return (
      <div className="mx-auto max-w-4xl">
        <h1 className="text-[21px] font-bold tracking-[-0.01em]">Opportunità</h1>
        <p className="mt-2 text-muted">
          Non c&apos;è ancora nessun profilo: i punteggi si calcolano rispetto a un profilo.
        </p>
      </div>
    );
  }

  const profile = profiles.find((p) => p.profile.id === profilo)?.profile ?? profiles[0].profile;
  const showAll = tutti === "1";
  const now = new Date();

  const evaluated = opportunities.map(({ opportunity, row }) => ({
    o: opportunity,
    row,
    e: evaluate(profile, opportunity, now),
  }));
  const hidden = evaluated.filter(({ e }) => e.verdict === "Non applicabile").length;
  const rows = evaluated
    .filter(({ e }) => showAll || e.verdict !== "Non applicabile")
    .sort((a, b) => STATUS_ORDER[a.o.status] - STATUS_ORDER[b.o.status] || b.e.score - a.e.score);

  return (
    <div className="mx-auto max-w-4xl">
      <ProfileChips profiles={profiles.map((p) => p.profile)} activeId={profile.id} />

      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-[21px] font-bold tracking-[-0.01em]">Opportunità</h1>
        <p className="text-xs text-muted">
          Punteggio e verdetto calcolati per <strong className="text-ink">{profile.name}</strong> · {rows.length}{" "}
          opportunità
        </p>
      </div>

      {hidden > 0 && (
        <p className="mt-1 text-xs text-muted">
          {showAll ? (
            <Link href={`/opportunita?profilo=${profile.id}`} className="underline">
              Nascondi i {hidden} bandi non pertinenti per questo profilo
            </Link>
          ) : (
            <Link href={`/opportunita?profilo=${profile.id}&tutti=1`} className="underline">
              Mostra anche {hidden} bandi non pertinenti per questo profilo
            </Link>
          )}
        </p>
      )}

      <ul className="mt-4 flex flex-col gap-2.5">
        {rows.map(({ o, row, e }) => (
          <OpportunityCard key={o.id} opportunity={o} row={row} evaluation={e} now={now} />
        ))}
      </ul>
    </div>
  );
}

function ProfileChips({ profiles, activeId }: { profiles: Profile[]; activeId: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {profiles.map((p) => {
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
  row,
  evaluation: e,
  now,
}: {
  opportunity: Opportunity;
  row: OpportunityRow;
  evaluation: Evaluation;
  now: Date;
}) {
  const days = o.deadline && o.status !== "Chiuso" ? daysUntil(o.deadline, now) : null;
  const urgencyTone: Tone | null = days === null ? null : days <= 15 ? "nogo" : days <= 30 ? "cond" : null;
  const blockingEligibility = e.breakdown.find((b) => b.eligibility && b.score === 0 && b.weight > 0);
  const closed = o.status === "Chiuso";

  return (
    <li className={`flex gap-4 rounded-card border border-line bg-paper px-4 py-3.5 ${closed ? "opacity-60" : ""}`}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap gap-1.5">
          <Pill>{o.level}</Pill>
          <Pill tone={STATUS_TONE[o.status]}>{o.status}</Pill>
          {days !== null && <Pill tone={urgencyTone ?? "neutral"}>Scade tra {days} giorni</Pill>}
          {row.needs_review && <Pill tone="cond">Da verificare</Pill>}
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
            Da completare o verificare: {e.uncertainParams.map((p) => `${p.label} (${p.status})`).join(", ")}
          </p>
        )}

        {o.sourceUrl && (
          <a href={o.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs underline">
            Vai alla fonte
          </a>
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
