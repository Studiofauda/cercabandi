import type { Evaluation } from "@/core/types";

export type Tone =
  | "go"
  | "cond"
  | "investigate"
  | "indirect"
  | "nogo"
  | "neutral"
  | "closed";

const TONE_CLASSES: Record<Tone, string> = {
  go: "bg-go text-go-ink",
  cond: "bg-cond text-cond-ink",
  investigate: "bg-investigate text-investigate-ink",
  indirect: "bg-indirect text-indirect-ink",
  nogo: "bg-nogo text-nogo-ink",
  neutral: "bg-neutral text-neutral-ink",
  closed: "bg-closed text-closed-ink",
};

/** Il tono deriva dal verdetto calcolato dal motore, non dal testo. */
export const VERDICT_TONE: Record<Evaluation["verdict"], Tone> = {
  GO: "go",
  "GO condizionato": "cond",
  "Da approfondire": "investigate",
  "Incarico tecnico": "indirect",
  "NO-GO": "nogo",
  "Non applicabile": "neutral",
};

export function Pill({
  tone = "neutral",
  size = "sm",
  children,
}: {
  tone?: Tone;
  size?: "sm" | "md";
  children: React.ReactNode;
}) {
  const sizeClass = size === "sm" ? "px-2 py-0.5 text-[10.5px]" : "px-2.5 py-1 text-xs";
  return (
    <span className={`inline-flex items-center rounded-full font-semibold whitespace-nowrap ${sizeClass} ${TONE_CLASSES[tone]}`}>
      {children}
    </span>
  );
}
