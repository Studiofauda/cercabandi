import type { OpportunityRow, SourceRow } from "@/lib/db/mappers";
import { PACK_LABELS, SUBJECT_LABELS } from "@/lib/labels";
import { SubmitButton } from "@/components/SubmitButton";
import { Section } from "@/components/SourceSearch";

const input = "rounded-control border border-line bg-paper px-3 py-2 text-[13.5px] outline-none focus:border-ink";

export const FORM_ERRORS: Record<string, string> = {
  titolo: "Il titolo è obbligatorio.",
  livello: "Scegli il livello del bando.",
  stato: "Scegli lo stato del bando.",
  soggetti: "Indica almeno un tipo di soggetto ammesso.",
  cofinanziamento: "La percentuale di cofinanziamento deve essere tra 0 e 100.",
  abitanti: "La soglia minima di abitanti non può superare quella massima.",
};

/** Modulo unico per inserire un bando nuovo o correggere uno esistente. */
export function BandoForm({
  action,
  row,
  sources,
  back,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  row?: Partial<OpportunityRow> & { kind?: string };
  sources: SourceRow[];
  back: string;
  submitLabel: string;
}) {
  const r = row ?? {};
  const eligible = r.eligible_subject_types ?? [];
  const packs = r.packs ?? [];
  const cumulabile = r.cumulabile === true ? "si" : r.cumulabile === false ? "no" : "";

  return (
    <form action={action} className="mt-5 flex flex-col gap-6">
      <input type="hidden" name="back" value={back} />

      <Section title="Il bando">
        <Field label="Titolo *">
          <input name="title" required defaultValue={r.title ?? ""} className={input} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Ente che lo pubblica">
            <input name="authority" defaultValue={r.authority ?? ""} className={input} placeholder="es. Regione Piemonte" />
          </Field>
          <Field label="Codice ufficiale (CIG, codice bando…)">
            <input name="external_code" defaultValue={r.external_code ?? ""} className={input} />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Livello *">
            <select name="level" defaultValue={r.level ?? "Regionale"} className={input}>
              {["Europeo", "Nazionale", "Regionale", "Locale"].map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Stato *">
            <select name="status" defaultValue={r.status ?? "Aperto"} className={input}>
              {["Aperto", "In arrivo", "Chiuso"].map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Tipo">
            <select name="kind" defaultValue={r.kind ?? "contributo"} className={input}>
              <option value="contributo">Contributo o finanziamento</option>
              <option value="gara">Gara d&apos;appalto</option>
              <option value="qualificazione">Qualificazione</option>
            </select>
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tema">
            <input name="theme" defaultValue={r.theme ?? ""} className={input} placeholder="es. Efficienza energetica" />
          </Field>
          <Field label="Territorio" help="Per i bandi locali e regionali includi il nome della regione: il motore lo confronta con il profilo.">
            <input name="territory" defaultValue={r.territory ?? ""} className={input} placeholder="es. Novara (NO) · Piemonte" />
          </Field>
        </div>
      </Section>

      <Section title="Chi può partecipare">
        <div className="flex flex-wrap gap-x-5 gap-y-1.5">
          {Object.entries(SUBJECT_LABELS).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-[13px]">
              <input type="checkbox" name="eligible" value={value} defaultChecked={eligible.includes(value)} />
              {label}
            </label>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Abitanti: soglia minima" help="Per i bandi riservati a Comuni di una certa dimensione.">
            <input type="number" name="abitanti_min" min={0} defaultValue={r.abitanti_min ?? ""} className={input} />
          </Field>
          <Field label="Abitanti: soglia massima" help="Es. 5000 per «Comuni fino a 5.000 abitanti» (estremo incluso).">
            <input type="number" name="abitanti_max" min={0} defaultValue={r.abitanti_max ?? ""} className={input} />
          </Field>
        </div>
      </Section>

      <Section title="Importi e scadenze">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Dotazione totale (€)" help="Il fondo complessivo del bando.">
            <input type="number" step="any" min={0} name="budget_totale" defaultValue={r.budget_totale ?? ""} className={input} />
          </Field>
          <Field label="Contributo massimo per progetto (€)" help="È su questo che si calcola il cofinanziamento.">
            <input type="number" step="any" min={0} name="contributo_max" defaultValue={r.contributo_max ?? ""} className={input} />
          </Field>
          <Field label="Cofinanziamento richiesto (%)">
            <input type="number" step="any" min={0} max={100} name="cofin_pct" defaultValue={r.cofinanziamento_richiesto_pct ?? ""} className={input} />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Scadenza">
            <input type="date" name="deadline" defaultValue={r.deadline ?? ""} className={input} />
          </Field>
          <Field label="Pubblicazione prevista" help="Per i bandi in arrivo.">
            <input type="date" name="expected_publication" defaultValue={r.expected_publication ?? ""} className={input} />
          </Field>
          <Field label="Origine dei fondi">
            <select name="funding_source" defaultValue={r.funding_source ?? ""} className={input}>
              <option value="">Non indicata</option>
              <option value="UE">UE</option>
              <option value="Nazionale">Nazionale</option>
              <option value="Regionale">Regionale</option>
              <option value="Privato">Privato</option>
            </select>
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" name="replicabile" defaultChecked={r.replicabile ?? false} />
            Replicabile su più committenti
          </label>
          <label className="flex items-center gap-2 text-[13px]">
            Cumulabile con altri contributi
            <select name="cumulabile" defaultValue={cumulabile} className={`${input} py-1`}>
              <option value="">Non verificato</option>
              <option value="si">Sì</option>
              <option value="no">No</option>
            </select>
          </label>
        </div>
      </Section>

      <Section title="Ambiti" help="Servono al confronto con i temi dei profili.">
        <div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-3">
          {Object.entries(PACK_LABELS).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-[13px]">
              <input type="checkbox" name="packs" value={value} defaultChecked={packs.includes(value)} />
              {label}
            </label>
          ))}
        </div>
      </Section>

      <Section title="Fonte e verifica">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Fonte">
            <select name="source_id" defaultValue={r.source_id ?? ""} className={input}>
              <option value="">Nessuna</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Link al bando">
            <input type="url" name="source_url" defaultValue={r.source_url ?? ""} className={input} placeholder="https://" />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" name="needs_review" defaultChecked={r.needs_review ?? false} />
          Da verificare sui testi ufficiali
        </label>
        <Field label="Note di verifica">
          <textarea name="review_notes" rows={4} defaultValue={r.review_notes ?? ""} className={input} />
        </Field>
      </Section>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-paper px-4 py-3">
        <span className="text-[11px] text-muted">Le modifiche restano nello storico del bando, con il valore precedente.</span>
        <SubmitButton pendingLabel="Salvataggio…">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}

function Field({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-xs font-semibold">{label}</span>
      {children}
      {help && <span className="text-[11px] text-muted">{help}</span>}
    </label>
  );
}
