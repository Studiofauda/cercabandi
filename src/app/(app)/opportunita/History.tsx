import type { RevisionRow } from "@/lib/db/queries";
import { date, dateTime, euro } from "@/lib/format";
import { PACK_LABELS, SUBJECT_LABELS } from "@/lib/labels";

/** Nomi leggibili dei campi del bando, per lo storico. */
const FIELD: Record<string, string> = {
  title: "Titolo",
  authority: "Ente",
  external_code: "Codice",
  level: "Livello",
  status: "Stato",
  kind: "Tipo",
  theme: "Tema",
  territory: "Territorio",
  eligible_subject_types: "Soggetti ammessi",
  packs: "Ambiti",
  funding_source: "Origine dei fondi",
  budget_totale: "Dotazione totale",
  contributo_max: "Contributo massimo",
  cofinanziamento_richiesto_pct: "Cofinanziamento",
  abitanti_min: "Abitanti minimi",
  abitanti_max: "Abitanti massimi",
  deadline: "Scadenza",
  expected_publication: "Pubblicazione prevista",
  replicabile: "Replicabile",
  cumulabile: "Cumulabile",
  source_id: "Fonte",
  source_url: "Link al bando",
  needs_review: "Da verificare",
  review_notes: "Note di verifica",
};

function show(field: string, v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "sì" : "no";
  if (Array.isArray(v)) {
    const labels = field === "packs" ? PACK_LABELS : field === "eligible_subject_types" ? SUBJECT_LABELS : null;
    return v.length ? v.map((x) => (labels ? (labels as Record<string, string>)[String(x)] ?? String(x) : String(x))).join(", ") : "—";
  }
  if (["budget_totale", "contributo_max"].includes(field)) return euro(Number(v));
  if (field === "cofinanziamento_richiesto_pct") return `${v}%`;
  if (["deadline", "expected_publication"].includes(field)) return date(String(v));
  if (field === "review_notes") return String(v).length > 80 ? `${String(v).slice(0, 77)}…` : String(v);
  if (field === "source_id") return "cambiata";
  return String(v);
}

export function History({ revisions }: { revisions: RevisionRow[] }) {
  if (revisions.length === 0) {
    return <p className="text-xs text-muted">Nessuna modifica registrata: il bando è com&apos;era quando è entrato in Cercabandi.</p>;
  }
  return (
    <ol className="flex flex-col gap-2.5">
      {revisions.map((r) => {
        const manual = r.changes.some((c) => c.by === "modifica manuale");
        return (
          <li key={r.id} className="border-l-2 border-line pl-3 text-xs">
            <p className="font-semibold">
              {dateTime(r.detected_at)} · <span className="font-normal text-muted">{manual ? "modifica manuale" : "aggiornamento dalla fonte"}</span>
            </p>
            <ul className="mt-0.5 flex flex-col gap-0.5">
              {r.changes.map((c) => (
                <li key={c.field}>
                  <span className="text-muted">{FIELD[c.field] ?? c.field}:</span> <s className="text-muted">{show(c.field, c.previous)}</s> → <strong>{show(c.field, c.current)}</strong>
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}
