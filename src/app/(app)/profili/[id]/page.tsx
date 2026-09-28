import Link from "next/link";
import { notFound } from "next/navigation";
import type { ParamValue } from "@/core/types";
import { getProfile } from "@/lib/db/queries";
import { PACK_LABELS, SUBJECT_LABELS, labelList } from "@/lib/labels";
import { date } from "@/lib/format";
import { paramFieldsFor, type ParamField } from "@/lib/profile-fields";
import { updateProfile } from "../actions";

const CONFIDENCE = [
  { value: "verificato", label: "Verificato" },
  { value: "stimato", label: "Stimato" },
  { value: "ipotesi", label: "Ipotesi" },
] as const;

const input = "rounded-control border border-line px-3 py-2 text-[13.5px] outline-none focus:border-ink";

export default async function ProfiloPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ campo?: string; salvato?: string; errore?: string }>;
}) {
  const { id } = await params;
  const { campo, salvato, errore } = await searchParams;
  const found = await getProfile(id);
  if (!found) notFound();
  const { profile: p, row } = found;
  const fields = paramFieldsFor(p.subjectType, p.interviewAnswers ?? {}, p.params);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/profili" className="text-xs text-muted hover:text-ink">
        ← Profili
      </Link>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <span className="grid size-11 place-items-center rounded-full bg-ink text-[14px] font-bold text-lime">{p.shortName}</span>
        <div className="min-w-0 flex-1">
          <h1 className="text-[21px] leading-tight font-bold tracking-[-0.01em]">{p.name}</h1>
          <p className="text-xs text-muted">
            {SUBJECT_LABELS[p.subjectType]} · {p.isTemplate ? "modello di categoria" : "soggetto reale"}
          </p>
        </div>
        <Link href={`/opportunita?profilo=${p.id}`} className="rounded-control border border-line px-3 py-1.5 text-xs font-semibold hover:border-ink">
          Vedi i bandi per questo profilo
        </Link>
        <Link href={`/simulazione?profilo=${p.id}`} className="rounded-control border border-line px-3 py-1.5 text-xs font-semibold hover:border-ink">
          Simula varianti
        </Link>
        <Link href={`/profili/${p.id}/intervista`} className="rounded-control border border-line px-3 py-1.5 text-xs font-semibold hover:border-ink">
          Rifai l&apos;intervista
        </Link>
      </div>

      {salvato && <p className="mt-3 rounded-control bg-go/20 px-3 py-2 text-xs text-go-ink">Modifiche salvate.</p>}
      {errore && <p className="mt-3 rounded-control bg-nogo/10 px-3 py-2 text-xs text-red">Modifiche non salvate: controlla di avere i permessi di modifica.</p>}

      <div className="mt-4 rounded-card bg-panel px-4 py-3 text-xs">
        <div>
          <span className="font-semibold">Ambiti: </span>
          {labelList(PACK_LABELS, p.packs) || "nessuno"}
        </div>
        <div className="mt-1">
          <span className="font-semibold">Temi: </span>
          {p.themes.join(", ") || "nessuno"}
        </div>
        <p className="mt-1 text-muted">Temi e ambiti si ricavano dalle risposte: per cambiarli rifai l&apos;intervista.</p>
      </div>

      <form action={updateProfile.bind(null, p.id)} className="mt-5 flex flex-col gap-6">
        <Section title="Identità">
          <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
            <Label text="Nome">
              <input name="name" defaultValue={p.name} className={input} required />
            </Label>
            <Label text="Sigla">
              <input name="short_name" defaultValue={p.shortName} maxLength={3} className={input} />
            </Label>
          </div>
          <Label text="Tipo di organizzazione">
            <input name="organization_type" defaultValue={p.organizationType} className={input} />
          </Label>
          <Label text="Il profilo rappresenta">
            <select name="is_template" defaultValue={p.isTemplate ? "modello" : "reale"} className={input}>
              <option value="reale">Un soggetto reale</option>
              <option value="modello">Un modello di categoria, per le simulazioni</option>
            </select>
          </Label>
        </Section>

        <Section title="Parametri usati nella valutazione">
          <p className="-mt-1 text-xs text-muted">
            Per ogni dato indica quanto è affidabile: i dati stimati o ipotetici allargano l&apos;intervallo del punteggio. Lascia vuoto ciò che non sai.
          </p>
          {fields.map((f) => (
            <ParamInput key={f.key} field={f} value={p.params[f.key]} highlighted={campo === f.key} />
          ))}
        </Section>

        <Section title="Documenti e requisiti">
          <div className="grid gap-3 sm:grid-cols-2">
            <Label text="Pronto (uno per riga)">
              <textarea name="evidence_ready" rows={4} defaultValue={row.evidence_ready.join("\n")} className={input} />
            </Label>
            <Label text="Manca (uno per riga)">
              <textarea name="evidence_missing" rows={4} defaultValue={row.evidence_missing.join("\n")} className={input} />
            </Label>
          </div>
          <Label text="Note">
            <textarea name="notes" rows={2} defaultValue={p.notes ?? ""} className={input} />
          </Label>
        </Section>

        <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t border-line bg-paper px-4 py-3">
          <span className="text-[11px] text-muted">Ultima modifica: {date(p.updatedAt)}</span>
          <button className="rounded-control bg-ink px-4 py-2 text-[13px] font-semibold text-lime">Salva le modifiche</button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="border-b border-line pb-1.5 text-[11px] font-semibold tracking-[0.03em] text-muted uppercase">{title}</h2>
      {children}
    </section>
  );
}

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold">{text}</span>
      {children}
    </label>
  );
}

function ParamInput({
  field: f,
  value,
  highlighted,
}: {
  field: ParamField;
  value?: ParamValue<unknown>;
  highlighted: boolean;
}) {
  const v = value?.value;
  const name = `p_${f.key}`;

  return (
    <div
      id={`campo-${f.key}`}
      className={`scroll-mt-6 rounded-control px-3 py-2.5 ${highlighted ? "bg-cond/40 ring-2 ring-ink" : "bg-panel/60"}`}
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[200px] flex-1 flex-col gap-1">
          <span className="text-xs font-semibold">{f.label}</span>
          {f.kind === "number" && (
            <input type="number" step="any" name={name} defaultValue={typeof v === "number" ? v : ""} className={input} />
          )}
          {f.kind === "text" && <input name={name} defaultValue={typeof v === "string" ? v : ""} className={input} />}
          {f.kind === "boolean" && (
            <select name={name} defaultValue={v === true ? "si" : v === false ? "no" : ""} className={input}>
              <option value="">Non indicato</option>
              <option value="si">Sì</option>
              <option value="no">No</option>
            </select>
          )}
        </label>
        {f.kind !== "multi" && (
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-muted">Affidabilità</span>
            <select name={`c_${f.key}`} defaultValue={value?.confidence ?? "verificato"} className={input}>
              {CONFIDENCE.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {f.kind === "multi" && (
        <>
          <span className="text-xs font-semibold">{f.label}</span>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1.5">
            {(f.options ?? []).map((o) => (
              <label key={o.value} className="flex items-center gap-1.5 text-[13px]">
                <input type="checkbox" name={name} value={o.value} defaultChecked={Array.isArray(v) && v.includes(o.value)} />
                {o.label}
              </label>
            ))}
          </div>
          <label className="mt-2 flex items-center gap-2 text-[11px] text-muted">
            Affidabilità
            <select name={`c_${f.key}`} defaultValue={value?.confidence ?? "verificato"} className={`${input} py-1`}>
              {CONFIDENCE.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      {f.help && <p className="mt-1.5 text-[11px] text-muted">{f.help}</p>}
      {value?.source && (
        <p className="mt-1 text-[11px] text-muted">
          Fonte del dato: {value.source}
          {value.updatedAt ? ` · ${date(value.updatedAt)}` : ""}
        </p>
      )}
    </div>
  );
}
