"use client";

import { useMemo, useState, useTransition } from "react";
import { evaluate, simulate } from "@/core/scoring";
import type { Evaluation, Opportunity, ParamValue, Profile, ProfileParams } from "@/core/types";
import { paramFieldsFor, type ParamField } from "@/lib/profile-fields";
import { Pill, VERDICT_TONE } from "@/components/Pill";
import { ScoreRange } from "@/components/ScoreRange";
import { deleteScenario, saveScenario } from "./actions";

interface Variant {
  key: string;
  label: string;
  params: Partial<ProfileParams>;
  savedId?: string;
  /** Modificata dopo l'ultimo salvataggio. */
  dirty: boolean;
}

const CONFIDENCE = ["verificato", "stimato", "ipotesi"] as const;
let counter = 0;
const newKey = () => `v${++counter}`;

/** Quanti bandi aperti risultano GO o condizionati: l'effetto della variante sull'intero catalogo. */
function catalogueSummary(profile: Profile, opportunities: Opportunity[], now: Date) {
  let go = 0;
  let cond = 0;
  for (const o of opportunities) {
    if (o.status === "Chiuso") continue;
    const v = evaluate(profile, o, now).verdict;
    if (v === "GO" || v === "Incarico tecnico") go++;
    else if (v === "GO condizionato") cond++;
  }
  return { go, cond };
}

export function Simulator({
  profile,
  opportunity,
  opportunities,
  saved,
}: {
  profile: Profile;
  opportunity: Opportunity;
  opportunities: Opportunity[];
  saved: Array<{ id: string; label: string; params: Partial<ProfileParams> }>;
}) {
  const now = useMemo(() => new Date(), []);
  const fields = useMemo(
    () => paramFieldsFor(profile.subjectType, profile.interviewAnswers ?? {}, profile.params),
    [profile]
  );
  const [variants, setVariants] = useState<Variant[]>(
    saved.map((s) => ({ key: newKey(), label: s.label, params: s.params, savedId: s.id, dirty: false }))
  );
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const base = useMemo(() => evaluate(profile, opportunity, now), [profile, opportunity, now]);
  const baseSummary = useMemo(() => catalogueSummary(profile, opportunities, now), [profile, opportunities, now]);
  const results = useMemo(
    () => simulate(profile, opportunity, variants.map((v) => ({ label: v.label, params: v.params })), now),
    [profile, opportunity, variants, now]
  );

  const add = (label: string, params: Partial<ProfileParams> = {}) =>
    setVariants((vs) => [...vs, { key: newKey(), label, params, dirty: true }]);
  const update = (key: string, patch: Partial<Variant>) =>
    setVariants((vs) => vs.map((v) => (v.key === key ? { ...v, dirty: true, ...patch } : v)));

  // Varianti pronte: le più utili per capire da cosa dipende il punteggio.
  const presets = useMemo(() => {
    const list: Array<{ label: string; params: Partial<ProfileParams> }> = [];
    const uncertain = Object.entries(profile.params).filter(([, p]) => p && p.confidence !== "verificato");
    if (uncertain.length) {
      list.push({
        label: "Tutti i dati verificati",
        params: Object.fromEntries(uncertain.map(([k, p]) => [k, { ...p!, confidence: "verificato" }])),
      });
    }
    const cofin = profile.params.capacitaCofinanziamento?.value;
    if (typeof cofin === "number") {
      list.push({
        label: "Cofinanziamento raddoppiato",
        params: { capacitaCofinanziamento: { ...profile.params.capacitaCofinanziamento!, value: cofin * 2 } },
      });
    }
    return list;
  }, [profile]);

  const save = (v: Variant) =>
    startTransition(async () => {
      // Una variante già salvata e poi modificata sostituisce la versione precedente.
      if (v.savedId) {
        const d = await deleteScenario(v.savedId);
        if (d.error) return setMessage(d.error);
      }
      const r = await saveScenario({ profileId: profile.id, opportunityId: opportunity.id, label: v.label, params: v.params });
      if (r.error) setMessage(r.error);
      else {
        setMessage(null);
        update(v.key, { savedId: r.id, dirty: false });
      }
    });

  const remove = (v: Variant) =>
    startTransition(async () => {
      if (v.savedId) {
        const r = await deleteScenario(v.savedId);
        if (r.error) return setMessage(r.error);
      }
      setVariants((vs) => vs.filter((x) => x.key !== v.key));
    });

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => add(`Variante ${variants.length + 1}`)} className="rounded-control bg-ink px-3 py-1.5 text-xs font-semibold text-lime">
          + Nuova variante
        </button>
        {presets.map((p) => (
          <button key={p.label} type="button" onClick={() => add(p.label, p.params)} className="rounded-control border border-line px-3 py-1.5 text-xs font-semibold hover:border-ink">
            + {p.label}
          </button>
        ))}
      </div>
      {message && <p className="mt-2 text-xs text-red">{message}</p>}

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <ResultCard title="Situazione attuale" evaluation={base} summary={baseSummary} />

        {variants.map((v, i) => {
          const e = results[i].evaluation;
          const summary = catalogueSummary({ ...profile, params: { ...profile.params, ...v.params } }, opportunities, now);
          return (
            <ResultCard
              key={v.key}
              title={
                <input
                  value={v.label}
                  onChange={(ev) => update(v.key, { label: ev.target.value })}
                  className="w-full rounded-control border border-transparent bg-transparent px-1 py-0.5 font-bold hover:border-line focus:border-ink focus:outline-none"
                />
              }
              evaluation={e}
              base={base}
              summary={summary}
              baseSummary={baseSummary}
              footer={
                <>
                  <VariantEditor fields={fields} profile={profile} params={v.params} onChange={(params) => update(v.key, { params })} />
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <button type="button" onClick={() => remove(v)} disabled={pending} className="text-xs text-muted hover:text-red">
                      Elimina
                    </button>
                    {v.savedId && !v.dirty ? (
                      <span className="text-[11px] text-positive-text">Salvata</span>
                    ) : (
                      <button type="button" onClick={() => save(v)} disabled={pending} className="rounded-control border border-line px-3 py-1 text-xs font-semibold hover:border-ink">
                        {v.savedId ? "Salva le modifiche" : "Salva variante"}
                      </button>
                    )}
                  </div>
                </>
              }
            />
          );
        })}
      </div>
    </div>
  );
}

function ResultCard({
  title,
  evaluation: e,
  base,
  summary,
  baseSummary,
  footer,
}: {
  title: React.ReactNode;
  evaluation: Evaluation;
  base?: Evaluation;
  summary: { go: number; cond: number };
  baseSummary?: { go: number; cond: number };
  footer?: React.ReactNode;
}) {
  const delta = base ? e.score - base.score : 0;
  const changed = base
    ? e.breakdown.filter((b) => {
        const before = base.breakdown.find((x) => x.criterion === b.criterion);
        return !before || Math.round(before.score) !== Math.round(b.score) || before.note !== b.note;
      })
    : [];

  return (
    <div className={`flex flex-col rounded-card border px-4 py-3.5 ${base ? "border-line bg-paper" : "border-ink bg-panel"}`}>
      <div className="text-[15px] font-bold">{title}</div>
      <div className="mt-2 flex items-start justify-between gap-3">
        <div>
          <Pill tone={VERDICT_TONE[e.verdict]} size="md">
            {e.verdict}
          </Pill>
          {base && delta !== 0 && (
            <p className={`mt-1.5 text-[13px] font-bold ${delta > 0 ? "text-positive-text" : "text-red"}`}>
              {delta > 0 ? "+" : ""}
              {delta} punti
            </p>
          )}
          {base && delta === 0 && <p className="mt-1.5 text-xs text-muted">Nessuna variazione</p>}
        </div>
        <ScoreRange evaluation={e} />
      </div>

      {changed.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1 text-xs">
          {changed.map((b) => (
            <li key={b.criterion}>
              <span className="font-semibold">{b.criterion}</span>: {b.note}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2 text-[11px] text-muted">
        Su tutti i bandi aperti: <strong className="text-ink">{summary.go}</strong> GO · {summary.cond} condizionati
        {baseSummary && summary.go !== baseSummary.go && (
          <span className={summary.go > baseSummary.go ? "text-positive-text" : "text-red"}>
            {" "}
            ({summary.go > baseSummary.go ? "+" : ""}
            {summary.go - baseSummary.go} GO)
          </span>
        )}
      </p>
      {footer}
    </div>
  );
}

/** Parametri modificati nella variante; gli altri restano quelli del profilo. */
function VariantEditor({
  fields,
  profile,
  params,
  onChange,
}: {
  fields: ParamField[];
  profile: Profile;
  params: Partial<ProfileParams>;
  onChange: (params: Partial<ProfileParams>) => void;
}) {
  const [adding, setAdding] = useState("");
  const edited = fields.filter((f) => f.key in params);
  const available = fields.filter((f) => !(f.key in params));

  const set = (key: string, value: ParamValue<unknown> | undefined) => {
    const next = { ...params, [key]: value };
    onChange(next);
  };
  const reset = (key: string) => {
    const next = { ...params };
    delete next[key];
    onChange(next);
  };

  return (
    <div className="mt-3 border-t border-line pt-3">
      {edited.map((f) => (
        <FieldRow key={f.key} field={f} value={params[f.key]} original={profile.params[f.key]} onChange={(v) => set(f.key, v)} onReset={() => reset(f.key)} />
      ))}
      {available.length > 0 && (
        <select
          value={adding}
          onChange={(e) => {
            const key = e.target.value;
            if (!key) return;
            set(key, profile.params[key] ?? { value: null, confidence: "verificato" });
            setAdding("");
          }}
          className="mt-1 w-full rounded-control border border-dashed border-line bg-paper px-2 py-1.5 text-xs text-muted"
        >
          <option value="">+ Cambia un parametro…</option>
          {available.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

function FieldRow({
  field: f,
  value,
  original,
  onChange,
  onReset,
}: {
  field: ParamField;
  value: ParamValue<unknown> | undefined;
  original: ParamValue<unknown> | undefined;
  onChange: (v: ParamValue<unknown> | undefined) => void;
  onReset: () => void;
}) {
  const v = value?.value;
  const confidence = value?.confidence ?? "verificato";
  const setValue = (nv: unknown) => onChange({ value: nv === undefined ? null : nv, confidence });
  const input = "w-full rounded-control border border-line px-2 py-1 text-[13px] outline-none focus:border-ink";

  return (
    <div className="mb-2 rounded-control bg-panel px-2.5 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold">{f.label}</span>
        <button type="button" onClick={onReset} className="text-[11px] text-muted hover:text-ink">
          ripristina
        </button>
      </div>
      <div className="mt-1 flex gap-2">
        {f.kind === "number" && (
          <input type="number" step="any" value={typeof v === "number" ? v : ""} onChange={(e) => setValue(e.target.value === "" ? undefined : Number(e.target.value))} className={input} />
        )}
        {f.kind === "text" && <input value={typeof v === "string" ? v : ""} onChange={(e) => setValue(e.target.value || undefined)} className={input} />}
        {f.kind === "boolean" && (
          <select value={v === true ? "si" : v === false ? "no" : ""} onChange={(e) => setValue(e.target.value === "si" ? true : e.target.value === "no" ? false : undefined)} className={input}>
            <option value="">Non indicato</option>
            <option value="si">Sì</option>
            <option value="no">No</option>
          </select>
        )}
        {f.kind !== "multi" && (
          <select
            value={confidence}
            onChange={(e) => v !== undefined && v !== null && onChange({ value: v, confidence: e.target.value as ParamValue<unknown>["confidence"] })}
            className="rounded-control border border-line px-1.5 py-1 text-[12px]"
          >
            {CONFIDENCE.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        )}
      </div>
      {f.kind === "multi" && (
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
          {(f.options ?? []).map((o) => {
            const list = Array.isArray(v) ? (v as string[]) : [];
            return (
              <label key={o.value} className="flex items-center gap-1 text-[12px]">
                <input
                  type="checkbox"
                  checked={list.includes(o.value)}
                  onChange={() => setValue(list.includes(o.value) ? list.filter((x) => x !== o.value) : [...list, o.value])}
                />
                {o.label}
              </label>
            );
          })}
        </div>
      )}
      <p className="mt-1 text-[11px] text-muted">
        Nel profilo: {original?.value === undefined || original?.value === null ? "non indicato" : Array.isArray(original.value) ? `${original.value.length} voci` : String(original.value === true ? "sì" : original.value === false ? "no" : original.value)}
        {original ? ` (${original.confidence})` : ""}
      </p>
    </div>
  );
}
