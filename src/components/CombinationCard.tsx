import Link from "next/link";
import type { CombinationFinding, CombinationLevel } from "@/core/combinations";
import type { Opportunity } from "@/core/types";
import { EXPENSE_LABELS, labelList } from "@/lib/labels";
import { Pill, type Tone } from "./Pill";

const LEVEL: Record<CombinationLevel, { label: string; tone: Tone }> = {
  promettente: { label: "Promettente", tone: "go" },
  "da-verificare": { label: "Da verificare", tone: "cond" },
  "non-combinabile": { label: "Da escludere", tone: "nogo" },
};

/**
 * Una coppia di bandi sullo stesso progetto. Il nucleo non stabilisce la cumulabilità:
 * segnala cosa vale la pena verificare, e perché.
 */
export function CombinationCard({
  finding: f,
  opportunities,
  hrefFor,
  focusId,
}: {
  finding: CombinationFinding;
  opportunities: Map<string, Opportunity>;
  hrefFor: (id: string) => string;
  /** Bando da cui si guarda la combinazione: mostrato per secondo. */
  focusId?: string;
}) {
  const [x, y] = f.opportunityIds;
  const ids = focusId === x ? [y, x] : [x, y];
  const [a, b] = ids.map((id) => opportunities.get(id)!);
  const level = LEVEL[f.level];

  return (
    <div className="rounded-card border border-line bg-paper px-3.5 py-3 text-[13px]">
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={level.tone}>{level.label}</Pill>
        {f.overlap.length > 0 && <span className="text-xs text-warning-text">Spese contese: {labelList(EXPENSE_LABELS, f.overlap)}</span>}
      </div>

      <div className="mt-2 flex flex-col gap-1.5">
        {[a, b].map((o) => (
          <div key={o.id}>
            <Link href={hrefFor(o.id)} scroll={false} className="font-semibold hover:underline">
              {o.title}
            </Link>
            {f.splitProposal?.[o.id] && (
              <p className="text-xs text-muted">Coprirebbe: {labelList(EXPENSE_LABELS, f.splitProposal[o.id]) || "—"}</p>
            )}
          </div>
        ))}
      </div>

      <ul className="mt-2 flex flex-col gap-1 text-xs text-ink-soft">
        {f.reasons.map((r) => (
          <li key={r}>· {r}</li>
        ))}
        {f.warnings.map((w) => (
          <li key={w} className="text-warning-text">
            ! {w}
          </li>
        ))}
      </ul>
    </div>
  );
}

export const COMBINATION_DISCLAIMER =
  "La cumulabilità si decide sui testi ufficiali dei due bandi e, per i fondi UE, sui regolamenti applicabili: qui sono segnalate le combinazioni da verificare e quelle da scartare subito, con i motivi. La verifica finale resta umana.";
