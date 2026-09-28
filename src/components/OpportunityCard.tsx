import Link from "next/link";
import type { Evaluation, Opportunity, Profile } from "@/core/types";
import type { OpportunityRow } from "@/lib/db/mappers";
import { daysUntil } from "@/lib/format";
import { Pill, VERDICT_TONE, type Tone } from "./Pill";
import { ScoreRange } from "./ScoreRange";

const STATUS_TONE: Record<Opportunity["status"], Tone> = {
  Aperto: "go",
  "In arrivo": "investigate",
  Chiuso: "closed",
};

export function ProfileChips({
  profiles,
  activeId,
  hrefFor,
}: {
  profiles: Profile[];
  activeId: string;
  hrefFor: (id: string) => string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {profiles.map((p) => {
        const active = p.id === activeId;
        return (
          <Link
            key={p.id}
            href={hrefFor(p.id)}
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

export function OpportunityCard({
  opportunity: o,
  row,
  evaluation: e,
  dismissed,
  href,
  now,
}: {
  opportunity: Opportunity;
  row: OpportunityRow;
  evaluation: Evaluation;
  dismissed: boolean;
  href: string;
  now: Date;
}) {
  const days = o.deadline && o.status !== "Chiuso" ? daysUntil(o.deadline, now) : null;
  const urgencyTone: Tone | null = days === null ? null : days <= 15 ? "nogo" : days <= 30 ? "cond" : null;
  const blockingEligibility = e.breakdown.find((b) => b.eligibility && b.score === 0 && b.weight > 0);
  const faded = o.status === "Chiuso" || dismissed;

  return (
    <div>
      <Link
        href={href}
        scroll={false}
        className={`flex gap-4 rounded-card border border-line bg-paper px-4 py-3.5 transition-colors hover:border-ink ${
          faded ? "opacity-60" : ""
        }`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-1.5">
            <Pill>{o.level}</Pill>
            <Pill tone={STATUS_TONE[o.status]}>{o.status}</Pill>
            {days !== null && <Pill tone={urgencyTone ?? "neutral"}>Scade tra {days} giorni</Pill>}
            {row.needs_review && <Pill tone="cond">Da verificare</Pill>}
            {dismissed && <Pill tone="closed">Scartato</Pill>}
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
        </div>

        <div className="flex flex-col items-end gap-2">
          <Pill tone={VERDICT_TONE[e.verdict]} size="md">
            {e.verdict}
          </Pill>
          <ScoreRange evaluation={e} />
        </div>
      </Link>
    </div>
  );
}
