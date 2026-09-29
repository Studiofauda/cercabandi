import Link from "next/link";
import { getConnectorFilters, getProfiles, getRuns } from "@/lib/db/queries";
import { DEFAULT_SEDIA_FILTERS, SEDIA_PROGRAMMES, type SediaFilters } from "@/lib/ingestion/sedia";
import { parseSediaQuery } from "@/lib/ingestion/nl-query";
import { date } from "@/lib/format";
import { SubmitButton } from "@/components/SubmitButton";
import { ProfileSwitcher, RunsList, Section } from "@/components/SourceSearch";
import { runSediaNow, saveSediaFilters } from "./actions";

// Si leggono qualche centinaio di bandi, una pagina al secondo: può servire più di mezzo minuto.
export const maxDuration = 60;

const input = "rounded-control border border-line px-3 py-2 text-[13.5px] outline-none focus:border-ink";
const WAIT = "Sto leggendo i bandi europei: può richiedere fino a un minuto. Non chiudere la pagina.";

export default async function SediaPage({
  searchParams,
}: {
  searchParams: Promise<{ profilo?: string; q?: string; salvato?: string; errore?: string }>;
}) {
  const { profilo, q, salvato, errore } = await searchParams;
  const profiles = await getProfiles();
  const profile = profiles.find((p) => p.profile.id === profilo)?.profile ?? profiles[0]?.profile;
  if (!profile) return <p className="text-muted">Serve almeno un profilo: le ricerche sono legate ai profili.</p>;

  const [settings, runs] = await Promise.all([getConnectorFilters("sedia", profile.id), getRuns("sedia", 8, profile.id)]);
  const saved: SediaFilters = { ...DEFAULT_SEDIA_FILTERS, ...((settings?.filters as Partial<SediaFilters>) ?? {}) };
  const parsed = q?.trim() ? parseSediaQuery(q) : null;
  const f: SediaFilters = parsed ? { ...saved, ...parsed.patch } : saved;
  const changed = new Set(parsed ? Object.keys(parsed.patch).filter((k) => k !== "ricerca") : []);
  const hl = (...keys: Array<keyof SediaFilters>) => (keys.some((k) => changed.has(k)) ? "rounded-card bg-cond/30 px-3 py-2 ring-2 ring-ink" : "");

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/fonti" className="text-xs text-muted hover:text-ink">
        ← Fonti
      </Link>
      <h1 className="mt-2 text-[21px] font-bold tracking-[-0.01em]">Ricerca su Funding & Tenders · bandi europei</h1>
      <p className="mt-1 text-xs text-muted">
        Il portale della Commissione europea per i contributi diretti (Horizon Europe, LIFE, Erasmus+, Europa Creativa, CERV…). Ogni profilo ha la sua ricerca; quelle
        salvate vengono controllate da sole ogni mattina.
      </p>

      <ProfileSwitcher profiles={profiles.map((p) => p.profile)} active={profile} hrefFor={(id) => `/fonti/sedia?profilo=${id}`} hasSearch={!!settings} />

      {salvato && <p className="mt-3 rounded-control bg-go/20 px-3 py-2 text-xs text-go-ink">Filtri di {profile.name} salvati. Valgono dal prossimo controllo.</p>}
      {errore && (
        <p className="mt-3 rounded-control bg-nogo/10 px-3 py-2 text-xs text-red">
          {errore === "salvataggio" ? "Filtri non salvati: controlla di avere i permessi di modifica." : `Controllo non riuscito: ${errore}`}
        </p>
      )}

      <section className="mt-4 rounded-card bg-panel px-4 py-3">
        <h2 className="text-[11px] font-semibold tracking-[0.03em] text-muted uppercase">2 · Descrivi cosa cerchi (facoltativo)</h2>
        <form className="mt-2 flex flex-wrap gap-2">
          <input type="hidden" name="profilo" value={profile.id} />
          <input name="q" defaultValue={q ?? saved.ricerca} placeholder="es. LIFE e Horizon su biodiversità e clima" className={`${input} min-w-0 flex-1 bg-paper`} />
          <button className="rounded-control border border-ink bg-paper px-3 py-2 text-[13px] font-semibold">Interpreta</button>
        </form>
        <p className="mt-1.5 text-[11px] text-muted">
          Riconosco i programmi (Horizon, LIFE, Erasmus, Europa Creativa, CERV…) e i temi, che traduco nelle parole inglesi con cui sono scritti i bandi.
        </p>
        {parsed && (
          <div className="mt-3 rounded-control border border-ink bg-paper px-3 py-2.5">
            <p className="text-xs font-semibold">Ho capito così:</p>
            <ul className="mt-1 flex flex-col gap-0.5 text-xs">
              {parsed.understood.map((u) => (
                <li key={u}>· {u}</li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-muted">I filtri qui sotto sono già aggiornati ed evidenziati in giallo: controllali, poi salva.</p>
          </div>
        )}
      </section>

      <form action={saveSediaFilters.bind(null, profile.id)} className="mt-5 flex flex-col gap-6">
        <input type="hidden" name="ricerca" value={parsed ? q : saved.ricerca} />
        <h2 className="-mb-3 text-[11px] font-semibold tracking-[0.03em] text-muted uppercase">3 · Filtri</h2>

        <Section title="Programmi" help="Di partenza sono esclusi difesa, nucleare e azione esterna. Nessun programma selezionato = tutti." className={hl("programmi")}>
          <div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
            {SEDIA_PROGRAMMES.map((p) => (
              <label key={p.code} className="flex items-center gap-2 text-[13px]">
                <input type="checkbox" name="programmi" value={p.code} defaultChecked={f.programmi.includes(p.code)} />
                {p.label}
              </label>
            ))}
          </div>
        </Section>

        <Section title="Temi e parole" help="I bandi europei sono in inglese: usa parole o radici inglesi (es. heritage, school, climate). Vuoto = nessun vincolo." className={hl("includi", "escludi")}>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold">Parole chiave: almeno una (una per riga)</span>
            <textarea name="includi" rows={3} defaultValue={f.includi.join("\n")} placeholder={"heritage\nclimate\nyouth"} className={input} />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold">Escludi i bandi che contengono (una per riga)</span>
            <textarea name="escludi" rows={2} defaultValue={f.escludi.join("\n")} placeholder="defence" className={input} />
          </label>
        </Section>

        <Section title="Altre opzioni" className={hl("inArrivo", "cascata", "budgetMin")}>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" name="in_arrivo" defaultChecked={f.inArrivo} />
            Includi i bandi annunciati ma non ancora aperti
          </label>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" name="cascata" defaultChecked={f.cascata} />
            Includi i bandi «a cascata» (gestiti da progetti già finanziati, spesso per PMI e piccoli enti)
          </label>
          <label className="flex flex-wrap items-center gap-2 text-[13px]">
            Budget del bando almeno
            <input type="number" name="budget_min" min={0} step="any" defaultValue={f.budgetMin ?? ""} className={`${input} w-36 py-1`} />€
          </label>
          <p className="text-[11px] text-muted">
            Il portale lascia «aperti» anche bandi scaduti da tempo: Cercabandi tiene solo quelli con una scadenza futura, o annunciati di recente.
          </p>
        </Section>

        <div className="sticky bottom-0 -mx-4 flex flex-wrap items-start justify-between gap-3 border-t border-line bg-paper px-4 py-3">
          <span className="pt-2 text-[11px] text-muted">
            {parsed ? "Filtri proposti dalla ricerca a parole: non ancora salvati" : settings ? `Filtri salvati il ${date(settings.updated_at)}` : "Filtri iniziali, non ancora salvati"}
          </span>
          <div className="flex flex-wrap items-start gap-2">
            <SubmitButton name="intent" value="salva" variant="secondary" pendingLabel="Salvataggio…">
              Salva i filtri
            </SubmitButton>
            <SubmitButton name="intent" value="controlla" pendingLabel="Controllo in corso…" pendingHint={WAIT}>
              Salva e controlla ora
            </SubmitButton>
          </div>
        </div>
      </form>

      <section className="mt-8">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-1.5">
          <h2 className="text-[11px] font-semibold tracking-[0.03em] text-muted uppercase">Controlli per {profile.name}</h2>
          {settings && (
            <form action={runSediaNow.bind(null, profile.id)}>
              <SubmitButton variant="secondary" pendingLabel="Controllo in corso…" pendingHint={WAIT}>
                Controlla ora con i filtri salvati
              </SubmitButton>
            </form>
          )}
        </div>
        <RunsList runs={runs} profileId={profile.id} showWindow={false} />
      </section>
    </div>
  );
}
