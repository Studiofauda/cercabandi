"use client";

import { useMemo, useState, useTransition } from "react";
import { buildInterview, deriveFromAnswers, type Answers, type Question } from "@/core/interview";
import type { PackId, SubjectType } from "@/core/types";
import { PACK_LABELS } from "@/lib/labels";
import { applyPackOverrides, type InterviewInput } from "@/lib/profile-build";
import type { ActionResult } from "./actions";

type Phase = "domande" | "identita" | "riepilogo";

function isAnswered(q: Question, a: unknown) {
  if (a === undefined || a === null || a === "") return false;
  if (Array.isArray(a)) return a.length > 0;
  return true;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter((w) => /^[A-Za-zÀ-ÿ]/.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export function Interview({
  initial,
  onSave,
  submitLabel,
}: {
  initial?: Partial<InterviewInput>;
  onSave: (input: InterviewInput) => Promise<ActionResult>;
  submitLabel: string;
}) {
  const [answers, setAnswers] = useState<Answers>(initial?.answers ?? {});
  const [estimates, setEstimates] = useState<Record<string, boolean>>(initial?.estimates ?? {});
  const [name, setName] = useState(initial?.name ?? "");
  const [shortName, setShortName] = useState(initial?.shortName ?? "");
  const [organizationType, setOrganizationType] = useState(initial?.organizationType ?? "");
  const [overrides, setOverrides] = useState<{ add: PackId[]; remove: PackId[] }>(
    initial?.packOverrides ?? { add: [], remove: [] }
  );
  const [phase, setPhase] = useState<Phase>("domande");
  const [currentId, setCurrentId] = useState<string>("subjectType");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const subjectType = (answers.subjectType as SubjectType | undefined) ?? null;
  // Il percorso si ricalcola a ogni risposta: alcune domande compaiono solo in certi casi.
  const questions = useMemo(() => buildInterview(subjectType, answers), [subjectType, answers]);
  const index = Math.max(0, questions.findIndex((q) => q.id === currentId));
  const question = questions[index];
  const derived = useMemo(
    () => (subjectType ? deriveFromAnswers(subjectType, answers) : { themes: [], packs: [] as PackId[] }),
    [subjectType, answers]
  );
  const packs = applyPackOverrides(derived.packs, overrides);

  const setAnswer = (id: string, value: unknown) => {
    setError(null);
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const next = () => {
    if (question.required && !isAnswered(question, answers[question.id])) {
      setError("Questa domanda è necessaria per proseguire.");
      return;
    }
    setError(null);
    // Dopo la prima risposta il percorso si allunga: si ricalcola sulla base delle risposte attuali.
    const updated = buildInterview((answers.subjectType as SubjectType) ?? null, answers);
    const i = updated.findIndex((q) => q.id === question.id);
    if (i < updated.length - 1) setCurrentId(updated[i + 1].id);
    else {
      if (!shortName && name) setShortName(initials(name));
      setPhase("identita");
    }
  };

  const prev = () => {
    setError(null);
    if (phase === "riepilogo") return setPhase("identita");
    if (phase === "identita") return setPhase("domande");
    if (index > 0) setCurrentId(questions[index - 1].id);
  };

  const togglePack = (p: PackId) => {
    const inDerived = derived.packs.includes(p);
    setOverrides((o) => {
      const add = new Set(o.add);
      const remove = new Set(o.remove);
      if (packs.includes(p)) {
        add.delete(p);
        if (inDerived) remove.add(p);
      } else {
        remove.delete(p);
        if (!inDerived) add.add(p);
      }
      return { add: Array.from(add), remove: Array.from(remove) };
    });
  };

  const save = () => {
    setError(null);
    startTransition(async () => {
      const result = await onSave({ answers, estimates, name, shortName, organizationType, packOverrides: overrides });
      if (result?.error) setError(result.error);
    });
  };

  const total = questions.length + 2;
  const step = phase === "domande" ? index + 1 : phase === "identita" ? questions.length + 1 : total;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="h-1.5 rounded-full bg-panel">
        <div className="h-full rounded-full bg-ink transition-all" style={{ width: `${(step / total) * 100}%` }} />
      </div>
      <p className="mt-1.5 text-[11px] text-muted">
        {phase === "domande" ? `Domanda ${index + 1} di ${questions.length}${subjectType ? "" : " — il percorso si definisce dopo questa risposta"}` : phase === "identita" ? "Quasi finito" : "Riepilogo"}
      </p>

      <div className="mt-5 rounded-card border border-line bg-paper px-5 py-5">
        {phase === "domande" && question && (
          <QuestionView
            q={question}
            value={answers[question.id]}
            estimate={!!estimates[question.id]}
            onChange={(v) => setAnswer(question.id, v)}
            onEstimate={(v) => setEstimates((e) => ({ ...e, [question.id]: v }))}
          />
        )}

        {phase === "identita" && (
          <div className="flex flex-col gap-3">
            <h2 className="text-[18px] font-bold">Come chiamiamo questo profilo?</h2>
            <TextInput label="Nome" value={name} onChange={(v) => setName(v)} placeholder="Es. Comune di Varallo, oppure Piccolo Comune montano (modello)" />
            <TextInput label="Sigla (1–3 lettere, per l'avatar)" value={shortName} onChange={(v) => setShortName(v.toUpperCase().slice(0, 3))} placeholder={initials(name) || "PC"} />
            <TextInput label="Tipo di organizzazione" value={organizationType} onChange={setOrganizationType} placeholder="Es. Comune montano di piccola dimensione" />
          </div>
        )}

        {phase === "riepilogo" && (
          <div className="flex flex-col gap-4">
            <h2 className="text-[18px] font-bold">Riepilogo</h2>
            <div>
              <h3 className="text-[11px] font-semibold tracking-[0.03em] text-muted uppercase">Temi emersi dalle risposte</h3>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {derived.themes.length ? (
                  derived.themes.map((t) => (
                    <span key={t} className="rounded-full bg-panel px-2.5 py-1 text-xs">
                      {t}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted">Nessun tema specifico.</span>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-[11px] font-semibold tracking-[0.03em] text-muted uppercase">Ambiti</h3>
              <p className="mt-1 text-xs text-muted">
                Calcolati dalle risposte. Puoi correggerli: le correzioni restano salvate a parte.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(Object.keys(PACK_LABELS) as PackId[]).map((p) => {
                  const on = packs.includes(p);
                  const manual = overrides.add.includes(p) || overrides.remove.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePack(p)}
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${on ? "border-ink bg-ink text-lime" : "border-line text-muted"}`}
                    >
                      {PACK_LABELS[p]}
                      {manual && " ✎"}
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="text-xs text-muted">
              {name} · {answers.isTemplate === "modello" ? "modello di categoria per le simulazioni" : "soggetto reale"}
            </p>
          </div>
        )}

        {error && <p className="mt-4 text-xs text-red">{error}</p>}

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={prev}
            disabled={phase === "domande" && index === 0}
            className="rounded-control px-3 py-2 text-[13px] font-semibold text-muted hover:text-ink disabled:opacity-40"
          >
            ← Indietro
          </button>
          {phase === "domande" && (
            <button type="button" onClick={next} className="rounded-control bg-ink px-4 py-2 text-[13px] font-semibold text-lime">
              {question && !question.required && !isAnswered(question, answers[question.id]) ? "Salta" : "Avanti"} →
            </button>
          )}
          {phase === "identita" && (
            <button
              type="button"
              onClick={() => (name.trim() ? setPhase("riepilogo") : setError("Dai un nome al profilo."))}
              className="rounded-control bg-ink px-4 py-2 text-[13px] font-semibold text-lime"
            >
              Avanti →
            </button>
          )}
          {phase === "riepilogo" && (
            <button type="button" onClick={save} disabled={pending} className="rounded-control bg-ink px-4 py-2 text-[13px] font-semibold text-lime disabled:opacity-60">
              {pending ? "Salvataggio…" : submitLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function QuestionView({
  q,
  value,
  estimate,
  onChange,
  onEstimate,
}: {
  q: Question;
  value: unknown;
  estimate: boolean;
  onChange: (v: unknown) => void;
  onEstimate: (v: boolean) => void;
}) {
  return (
    <div>
      <h2 className="text-[18px] leading-snug font-bold">{q.prompt}</h2>
      {q.help && <p className="mt-1.5 text-[13px] text-muted">{q.help}</p>}

      <div className="mt-4">
        {q.kind === "single" && (
          <div className="flex flex-col gap-2">
            {q.options?.map((o) => (
              <OptionButton key={o.value} selected={value === o.value} onClick={() => onChange(o.value)}>
                {o.label}
              </OptionButton>
            ))}
          </div>
        )}

        {q.kind === "multi" && (
          <div className="flex flex-col gap-2">
            {q.options?.map((o) => {
              const list = Array.isArray(value) ? (value as string[]) : [];
              const selected = list.includes(o.value);
              return (
                <OptionButton
                  key={o.value}
                  multi
                  selected={selected}
                  onClick={() => {
                    // «Nessuna» esclude le altre scelte, e viceversa.
                    if (o.value === "nessuna") return onChange(selected ? [] : ["nessuna"]);
                    const without = list.filter((v) => v !== "nessuna" && v !== o.value);
                    onChange(selected ? without : [...without, o.value]);
                  }}
                >
                  {o.label}
                </OptionButton>
              );
            })}
          </div>
        )}

        {q.kind === "boolean" && (
          <div className="flex gap-2">
            <OptionButton selected={value === true} onClick={() => onChange(true)}>
              Sì
            </OptionButton>
            <OptionButton selected={value === false} onClick={() => onChange(false)}>
              No
            </OptionButton>
            {!q.required && (
              <OptionButton selected={value === undefined} onClick={() => onChange(undefined)}>
                Non so
              </OptionButton>
            )}
          </div>
        )}

        {q.kind === "number" && (
          <div className="flex flex-col gap-2">
            <input
              type="number"
              inputMode="decimal"
              value={typeof value === "number" ? value : ""}
              onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
              className="w-full max-w-xs rounded-control border border-line px-3 py-2 text-[15px] outline-none focus:border-ink"
            />
            <label className="flex items-center gap-2 text-[13px] text-muted">
              <input type="checkbox" checked={estimate} onChange={(e) => onEstimate(e.target.checked)} />
              È una stima, non un dato verificato
            </label>
          </div>
        )}

        {q.kind === "text" && (
          <input
            type="text"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-control border border-line px-3 py-2 text-[15px] outline-none focus:border-ink"
          />
        )}
      </div>
    </div>
  );
}

function OptionButton({
  selected,
  multi = false,
  onClick,
  children,
}: {
  selected: boolean;
  multi?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-control border px-3.5 py-2.5 text-left text-[14px] transition-colors ${
        selected ? "border-ink bg-ink text-paper" : "border-line hover:border-ink"
      }`}
    >
      <span
        className={`grid size-4 shrink-0 place-items-center border text-[10px] ${multi ? "rounded" : "rounded-full"} ${
          selected ? "border-lime bg-lime text-ink" : "border-line"
        }`}
      >
        {selected ? "✓" : ""}
      </span>
      {children}
    </button>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold tracking-[0.03em] text-muted uppercase">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-control border border-line px-3 py-2 text-[14px] outline-none focus:border-ink"
      />
    </label>
  );
}
