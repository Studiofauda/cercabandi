import type { Evaluation } from "@/core/types";
import { VERDICT_TONE } from "./Pill";

const BAR_COLOR: Record<string, string> = {
  go: "bg-go",
  cond: "bg-cond",
  investigate: "bg-blue/40",
  indirect: "bg-indirect",
  nogo: "bg-nogo",
  neutral: "bg-line",
  closed: "bg-ink",
};

/**
 * Punteggio con intervallo di incertezza: il numero centrale, e sotto una barra 0–100
 * con la fascia dell'intervallo e un segno sul punteggio.
 * Quando il verdetto è NO-GO il numero passa in secondo piano: conta il blocco, non la media.
 */
export function ScoreRange({ evaluation }: { evaluation: Evaluation }) {
  const [min, max] = evaluation.scoreRange;
  const tone = VERDICT_TONE[evaluation.verdict];
  const blocked = evaluation.verdict === "NO-GO" || evaluation.verdict === "Non applicabile";
  const hasRange = max > min;

  return (
    <div className="w-[120px] shrink-0">
      <div className="flex items-baseline gap-1.5">
        <span className={`text-[26px] leading-none font-bold tabular-nums ${blocked ? "text-muted" : ""}`}>
          {evaluation.score}
        </span>
        <span className="text-[11px] text-muted tabular-nums">{hasRange ? `${min}–${max}` : "% compat."}</span>
      </div>
      <div className="relative mt-2 h-2 rounded-full bg-panel" aria-hidden>
        <div
          className={`absolute inset-y-0 rounded-full ${blocked ? "bg-line" : BAR_COLOR[tone]} ${hasRange ? "opacity-60" : ""}`}
          style={{ left: `${min}%`, width: `${Math.max(max - min, 1.5)}%` }}
        />
        <div
          className="absolute -top-0.5 h-3 w-0.5 rounded bg-ink"
          style={{ left: `calc(${evaluation.score}% - 1px)` }}
        />
      </div>
    </div>
  );
}
