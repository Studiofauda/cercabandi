import Link from "next/link";
import type { Evaluation, Opportunity, Profile, ScoreBreakdown, Source } from "@/core/types";
import type { OpportunityRow } from "@/lib/db/mappers";
import type { AssessmentNoteRow, DismissalRow } from "@/lib/db/queries";
import { Pill, VERDICT_TONE, type Tone } from "@/components/Pill";
import { ScoreRange } from "@/components/ScoreRange";
import { date, daysUntil, euro, pct } from "@/lib/format";
import { EXPENSE_LABELS, PACK_LABELS, SUBJECT_LABELS, labelList } from "@/lib/labels";
import { dismissOpportunity, markVerified, restoreOpportunity, saveAssessmentNote } from "./actions";

const ROLE_LABEL = {
  "beneficiario-diretto": "Candidatura diretta",
  "incarico-tecnico": "Incarico tecnico per un ente",
  "partner-di-progetto": "Partner di progetto",
} as const;

const RELIABILITY_TONE: Record<Source["reliability"], Tone> = {
  Ufficiale: "go",
  Istituzionale: "investigate",
  Secondaria: "neutral",
};


export function DetailPanel({
  opportunity: o,
  row,
  evaluation: e,
  profile,
  source,
  dismissal,
  note,
  closeHref,
  selfHref,
  error,
  now,
}: {
  opportunity: Opportunity;
  row: OpportunityRow;
  evaluation: Evaluation;
  profile: Profile;
  source?: Source;
  dismissal?: DismissalRow;
  note: AssessmentNoteRow | null;
  closeHref: string;
  selfHref: string;
  error?: string;
  now: Date;
}) {
  const days = o.deadline && o.status !== "Chiuso" ? daysUntil(o.deadline, now) : null;
  const blocking = e.breakdown.find((b) => b.eligibility && b.score === 0 && b.weight > 0);
  const hidden = (
    <>
      <input type="hidden" name="opportunityId" value={o.id} />
      <input type="hidden" name="profileId" value={profile.id} />
      <input type="hidden" name="back" value={selfHref} />
    </>
  );

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <Link href={closeHref} aria-label="Chiudi il dettaglio" className="absolute inset-0 bg-ink/40" scroll={false} />
      <aside
        role="dialog"
        aria-label={o.title}
        className="relative z-10 h-full w-full max-w-[480px] overflow-y-auto bg-paper px-5 py-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            <Pill>{o.level}</Pill>
            <Pill tone={o.status === "Aperto" ? "go" : o.status === "Chiuso" ? "closed" : "investigate"}>{o.status}</Pill>
            {days !== null && <Pill tone={days <= 15 ? "nogo" : days <= 30 ? "cond" : "neutral"}>Scade tra {days} giorni</Pill>}
            {row.needs_review && <Pill tone="cond">Da verificare</Pill>}
          </div>
          <Link href={closeHref} scroll={false} className="text-[20px] leading-none text-muted hover:text-ink" aria-label="Chiudi">
            ×
          </Link>
        </div>

        <h2 className="mt-3 text-[21px] leading-tight font-bold tracking-[-0.01em]">{o.title}</h2>
        <p className="mt-1 text-xs text-muted">
          {o.authority} · {o.territory}
        </p>

        {error && <p className="mt-3 rounded-control bg-nogo/10 px-3 py-2 text-xs text-red">{error}</p>}

        {/* Punteggio */}
        <section className="mt-4 rounded-card bg-panel px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold tracking-[0.03em] text-muted uppercase">Per {profile.name}</div>
              <div className="mt-1.5">
                <Pill tone={VERDICT_TONE[e.verdict]} size="md">
                  {e.verdict}
                </Pill>
              </div>
              {e.role && <p className="mt-1.5 text-xs text-muted">{ROLE_LABEL[e.role]}</p>}
            </div>
            <ScoreRange evaluation={e} />
          </div>
          {blocking && <p className="mt-2 text-[13px] font-semibold text-red">Non ammissibile: {blocking.note}</p>}
        </section>

        {/* Scomposizione */}
        {e.breakdown.length > 0 && (
          <Section title="Come si arriva al punteggio">
            <ul className="flex flex-col gap-2.5">
              {e.breakdown.map((b) => (
                <BreakdownRow key={b.criterion} b={b} />
              ))}
            </ul>
            {e.scoreRange[1] > e.scoreRange[0] && (
              <p className="mt-2 text-xs text-muted">
                L&apos;intervallo {e.scoreRange[0]}–{e.scoreRange[1]} dipende dai dati incerti qui sotto: completandoli si restringe.
              </p>
            )}
          </Section>
        )}

        {/* Dati incerti */}
        {e.uncertainParams.length > 0 && (
          <Section title="Dati da completare o verificare">
            <ul className="flex flex-col gap-1.5 text-[13px]">
              {e.uncertainParams.map((p) => (
                <li key={`${p.criterion}-${p.key}`} className="flex flex-wrap items-baseline gap-x-2">
                  <Pill tone={p.status === "stimato" ? "cond" : "neutral"}>{p.status}</Pill>
                  {p.subject === "profilo" ? (
                    <Link href={`/profili/${profile.id}?campo=${p.key}#campo-${p.key}`} className="font-semibold underline">
                      {p.label}
                    </Link>
                  ) : (
                    <span className="font-semibold">{p.label}</span>
                  )}
                  <span className="text-xs text-muted">
                    {p.subject === "profilo" ? "del profilo" : "del bando, da ricavare dal testo ufficiale"} · incide su {p.criterion}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Dati del bando */}
        <Section title="Dati del bando">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
            <Row label="Scadenza" value={o.deadline ? date(o.deadline) : "Non indicata"} />
            <Row label="Dotazione totale" value={euro(o.budgetTotale)} />
            <Row label="Contributo massimo" value={euro(o.contributoMax)} />
            <Row label="Cofinanziamento" value={o.cofinanziamentoRichiestoPct === undefined ? "Non indicato" : pct(o.cofinanziamentoRichiestoPct)} />
            {(o.abitantiMin !== undefined || o.abitantiMax !== undefined) && (
              <Row
                label="Soglia abitanti"
                value={[o.abitantiMin !== undefined && `da ${o.abitantiMin.toLocaleString("it-IT")}`, o.abitantiMax !== undefined && `fino a ${o.abitantiMax.toLocaleString("it-IT")}`].filter(Boolean).join(" ")}
              />
            )}
            <Row label="Soggetti ammessi" value={labelList(SUBJECT_LABELS, o.eligibleSubjectTypes) || "—"} />
            <Row label="Ambiti" value={labelList(PACK_LABELS, o.packs) || "—"} />
            <Row label="Voci di spesa" value={labelList(EXPENSE_LABELS, o.expenseCategories) || "Non estratte"} />
            <Row label="Origine dei fondi" value={o.fundingSource ?? "Non indicata"} />
            <Row label="Replicabile" value={o.replicabile ? "Sì, su più committenti" : "No"} />
            {row.external_code && <Row label="Codice" value={row.external_code} />}
          </dl>
        </Section>

        {/* Verifica */}
        {row.review_notes && (
          <Section title={row.needs_review ? "Da verificare sui testi ufficiali" : "Note di importazione"}>
            <p className="text-[12.5px] leading-relaxed whitespace-pre-line text-ink-soft">{row.review_notes}</p>
            {row.needs_review && (
              <form action={markVerified} className="mt-2">
                {hidden}
                <button className="rounded-control border border-line px-3 py-1.5 text-xs font-semibold hover:border-ink">
                  Segna come verificato
                </button>
              </form>
            )}
          </Section>
        )}

        {/* Fonte */}
        <Section title="Fonte e affidabilità">
          <div className="text-[13px]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{source?.name ?? "Fonte non collegata"}</span>
              {source && <Pill tone={RELIABILITY_TONE[source.reliability]}>{source.reliability}</Pill>}
            </div>
            {source?.method && <p className="mt-1 text-xs text-muted">Metodo: {source.method}</p>}
            <p className="mt-1 text-xs text-muted">Ultima verifica: {date(o.verifiedAt)}</p>
            {o.sourceUrl && (
              <a href={o.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block rounded-control bg-ink px-3 py-1.5 text-xs font-semibold text-lime">
                Vai alla fonte ↗
              </a>
            )}
          </div>
        </Section>

        {/* Analisi qualitativa */}
        <Section title="Analisi del team">
          <form action={saveAssessmentNote} className="flex flex-col gap-2.5">
            {hidden}
            <NoteField name="eligibility" label="Ammissibilità" value={note?.eligibility ?? ""} single />
            <NoteField name="advantages" label="Vantaggi" tone="text-positive-text" value={note?.advantages} />
            <NoteField name="weaknesses" label="Punti deboli" tone="text-warning-text" value={note?.weaknesses} />
            <NoteField name="red_flags" label="Red flag" tone="text-red" value={note?.red_flags} />
            <NoteField name="next_steps" label="Prossimi passi" value={note?.next_steps} />
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted">
                {note ? `Aggiornate il ${date(note.updated_at)}` : "Una voce per riga. Valgono per questo bando e questo profilo."}
              </span>
              <button className="rounded-control bg-ink px-3 py-1.5 text-xs font-semibold text-lime">Salva note</button>
            </div>
          </form>
        </Section>

        {/* Scarto */}
        <Section title="Scarta">
          {dismissal ? (
            <form action={restoreOpportunity} className="text-[13px]">
              {hidden}
              <p>
                Scartato il {date(dismissal.dismissed_at)}: <em>{dismissal.reason}</em>
              </p>
              <button className="mt-2 rounded-control border border-line px-3 py-1.5 text-xs font-semibold hover:border-ink">
                Ripristina
              </button>
            </form>
          ) : (
            <form action={dismissOpportunity} className="flex flex-col gap-2">
              {hidden}
              <textarea
                name="reason"
                rows={2}
                required
                placeholder="Perché questo bando non fa per questo profilo?"
                className="rounded-control border border-line px-3 py-2 text-[13px] outline-none focus:border-ink"
              />
              <p className="text-[11px] text-muted">Lo scarto vale solo per {profile.name} e si può annullare: il bando resta rivalutabile.</p>
              <button className="self-start rounded-control border border-red px-3 py-1.5 text-xs font-semibold text-red hover:bg-red hover:text-paper">
                Scarta con motivo
              </button>
            </form>
          )}
        </Section>
      </aside>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5 border-t border-line pt-4">
      <h3 className="mb-2.5 text-[11px] font-semibold tracking-[0.03em] text-muted uppercase">{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

function BreakdownRow({ b }: { b: ScoreBreakdown }) {
  const inactive = b.weight === 0;
  const flags = b.uncertainParams?.map((p) => p.status) ?? [];
  return (
    <li className={inactive ? "opacity-50" : ""}>
      <div className="flex items-baseline justify-between gap-2 text-[13px]">
        <span className="font-semibold">
          {b.criterion}
          {flags.length > 0 && <span className="ml-1.5 text-[10.5px] font-semibold text-warning-text">[{flags.join(", ")}]</span>}
        </span>
        <span className="text-xs text-muted tabular-nums">
          {inactive ? "non si applica" : `peso ${Math.round(b.weight * 100)}% · ${Math.round(b.score)}/100`}
        </span>
      </div>
      {!inactive && (
        <div className="mt-1 h-1.5 rounded-full bg-panel">
          <div
            className={`h-full rounded-full ${b.score === 0 ? "bg-red" : b.score < 50 ? "bg-cond" : "bg-go"}`}
            style={{ width: `${Math.max(b.score, 2)}%` }}
          />
        </div>
      )}
      <p className="mt-1 text-xs text-muted">{b.note}</p>
    </li>
  );
}

function NoteField({
  name,
  label,
  value,
  tone = "text-ink",
  single = false,
}: {
  name: string;
  label: string;
  value?: string | string[];
  tone?: string;
  single?: boolean;
}) {
  const text = Array.isArray(value) ? value.join("\n") : (value ?? "");
  return (
    <label className="flex flex-col gap-1">
      <span className={`text-xs font-semibold ${tone}`}>{label}</span>
      <textarea
        name={name}
        rows={single ? 1 : 2}
        defaultValue={text}
        className="rounded-control border border-line px-3 py-1.5 text-[13px] outline-none focus:border-ink"
      />
    </label>
  );
}
