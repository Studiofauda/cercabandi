import Link from "next/link";
import { getConnectorFilters, getProfiles, getRuns } from "@/lib/db/queries";
import { ANAC_TIPOLOGIE, CPV_PRESETS, DEFAULT_ANAC_FILTERS, type AnacFilters } from "@/lib/ingestion/anac";
import { parseQuery } from "@/lib/ingestion/nl-query";
import { REGIONI, regioneBreve } from "@/lib/geo";
import { date, dateTime } from "@/lib/format";
import { Pill } from "@/components/Pill";
import { SubmitButton } from "@/components/SubmitButton";
import { runAnacNow, saveAnacFilters } from "./actions";

// Il controllo legge ANAC e scrive nel database: può richiedere qualche decina di secondi.
export const maxDuration = 60;

const input = "rounded-control border border-line px-3 py-2 text-[13.5px] outline-none focus:border-ink";
const WAIT = "Sto leggendo gli avvisi ANAC: può richiedere fino a un minuto. Non chiudere la pagina.";

export default async function AnacPage({
  searchParams,
}: {
  searchParams: Promise<{ profilo?: string; q?: string; salvato?: string; errore?: string }>;
}) {
  const { profilo, q, salvato, errore } = await searchParams;
  const profiles = await getProfiles();
  const profile = profiles.find((p) => p.profile.id === profilo)?.profile ?? profiles[0]?.profile;
  if (!profile) return <p className="text-muted">Serve almeno un profilo: le ricerche sono legate ai profili.</p>;

  const [settings, runs] = await Promise.all([getConnectorFilters("anac", profile.id), getRuns("anac", 8, profile.id)]);
  const saved: AnacFilters = { ...DEFAULT_ANAC_FILTERS, ...((settings?.filters as Partial<AnacFilters>) ?? {}) };

  // Ricerca a parole: i filtri proposti si mostrano nel modulo, ma si salvano solo col bottone.
  const parsed = q?.trim() ? parseQuery(q) : null;
  const f: AnacFilters = parsed ? { ...saved, ...parsed.patch } : saved;
  const changed = new Set(parsed ? Object.keys(parsed.patch).filter((k) => k !== "ricerca") : []);
  const hl = (key: keyof AnacFilters) => (changed.has(key) ? "rounded-card bg-cond/30 px-3 py-2 ring-2 ring-ink" : "");

  const presetCodes = new Set(CPV_PRESETS.map((p) => p.code));
  const otherCpv = f.cpv.filter((c) => !presetCodes.has(c));
  const last = runs[0];
  const lastProfileName = profile.name;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/fonti`} className="text-xs text-muted hover:text-ink">
        ← Fonti
      </Link>
      <h1 className="mt-2 text-[21px] font-bold tracking-[-0.01em]">Ricerca su ANAC · Pubblicità legale</h1>
      <p className="mt-1 text-xs text-muted">
        Raccoglie gli avvisi di tutte le stazioni appaltanti italiane, compresi MIT e Province. Ogni profilo ha la sua ricerca.
      </p>

      {/* 1. Per quale profilo */}
      <section className="mt-4 rounded-card border-2 border-ink px-4 py-3">
        <h2 className="text-[11px] font-semibold tracking-[0.03em] text-muted uppercase">1 · Stai cercando per</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {profiles.map(({ profile: p }) => {
            const active = p.id === profile.id;
            return (
              <Link
                key={p.id}
                href={`/fonti/anac?profilo=${p.id}`}
                className={`flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-[13px] font-semibold ${
                  active ? "border-ink bg-ink text-paper" : "border-line hover:border-ink"
                }`}
              >
                <span className={`grid size-6 place-items-center rounded-full text-[10.5px] font-bold ${active ? "bg-lime text-ink" : "bg-panel"}`}>{p.shortName}</span>
                {p.name}
              </Link>
            );
          })}
        </div>
        <p className="mt-2 text-xs">
          Filtri e controlli qui sotto riguardano <strong>{profile.name}</strong>
          {settings ? "" : " (non ha ancora una ricerca salvata: sono proposti i filtri iniziali)"}.
        </p>
      </section>

      {salvato && <p className="mt-3 rounded-control bg-go/20 px-3 py-2 text-xs text-go-ink">Filtri di {profile.name} salvati. Valgono dal prossimo controllo.</p>}
      {errore && (
        <p className="mt-3 rounded-control bg-nogo/10 px-3 py-2 text-xs text-red">
          {errore === "cpv"
            ? "Indica almeno un codice CPV."
            : errore === "salvataggio"
              ? "Filtri non salvati: controlla di avere i permessi di modifica e che il database sia aggiornato."
              : `Controllo non riuscito: ${errore}`}
        </p>
      )}

      {/* 2. Ricerca a parole */}
      <section className="mt-4 rounded-card bg-panel px-4 py-3">
        <h2 className="text-[11px] font-semibold tracking-[0.03em] text-muted uppercase">2 · Descrivi cosa cerchi (facoltativo)</h2>
        <form className="mt-2 flex flex-wrap gap-2">
          <input type="hidden" name="profilo" value={profile.id} />
          <input
            name="q"
            defaultValue={q ?? saved.ricerca}
            placeholder="es. progettazione edilizia scolastica Lazio sopra 100.000 euro"
            className={`${input} min-w-0 flex-1 bg-paper`}
          />
          <button className="rounded-control border border-ink bg-paper px-3 py-2 text-[13px] font-semibold">Interpreta</button>
        </form>
        <p className="mt-1.5 text-[11px] text-muted">
          Riconosco regioni e province, temi (scuole, ponti, sport, restauro, energia…), tipi di servizio, importi, esclusioni («tranne…») e periodo («ultimi 30 giorni»).
        </p>
        {parsed && (
          <div className="mt-3 rounded-control border border-ink bg-paper px-3 py-2.5">
            <p className="text-xs font-semibold">Ho capito così:</p>
            <ul className="mt-1 flex flex-col gap-0.5 text-xs">
              {parsed.understood.map((u) => (
                <li key={u}>· {u}</li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-muted">I filtri qui sotto sono già aggiornati ed evidenziati in giallo. Controllali, poi salva: finché non salvi non cambia nulla.</p>
          </div>
        )}
      </section>

      {/* 3. Filtri */}
      <form action={saveAnacFilters.bind(null, profile.id)} className="mt-5 flex flex-col gap-6">
        <input type="hidden" name="ricerca" value={parsed ? q : saved.ricerca} />
        <h2 className="-mb-3 text-[11px] font-semibold tracking-[0.03em] text-muted uppercase">3 · Filtri</h2>

        <Section title="Tipo di servizio (codici CPV)" help="Si prende ogni avviso con almeno un lotto in queste famiglie. Un prefisso di 3 cifre include tutta la famiglia." className={hl("cpv")}>
          <div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
            {CPV_PRESETS.map((p) => (
              <label key={p.code} className="flex items-center gap-2 text-[13px]">
                <input type="checkbox" name="cpv" value={p.code} defaultChecked={f.cpv.includes(p.code)} />
                <span className="tabular-nums text-muted">{p.code}</span> {p.label}
              </label>
            ))}
          </div>
          <label className="mt-2 flex flex-col gap-1 text-xs">
            <span className="font-semibold">Altri codici CPV (separati da virgola)</span>
            <input name="cpv_altri" defaultValue={otherCpv.join(", ")} placeholder="es. 90712000, 7132" className={input} />
          </label>
        </Section>

        <Section title="Regioni" help="Un avviso senza luogo certo viene tenuto e segnato «luogo da verificare». Nessuna regione selezionata = tutta Italia." className={hl("regioni")}>
          <div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-3">
            {REGIONI.map((r) => (
              <label key={r} className="flex items-center gap-2 text-[13px]">
                <input type="checkbox" name="regioni" value={regioneBreve(r)} defaultChecked={f.regioni.includes(regioneBreve(r)) || f.regioni.includes(r)} />
                {regioneBreve(r)}
              </label>
            ))}
          </div>
        </Section>

        <Section title="Temi e parole" help="Utile per i temi che non hanno un codice CPV (es. scuole): l'avviso deve contenere almeno una di queste parole o radici. Vuoto = nessun vincolo." className={hl("includi")}>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold">Parole chiave: almeno una (una per riga)</span>
            <textarea name="includi" rows={3} defaultValue={f.includi.join("\n")} placeholder={"scuol\nscolastic\nasilo"} className={input} />
          </label>
          <label className={`flex flex-col gap-1 text-xs ${hl("escludi")}`}>
            <span className="font-semibold">Escludi gli avvisi che contengono (una per riga)</span>
            <textarea name="escludi" rows={2} defaultValue={f.escludi.join("\n")} placeholder={"manutenzione del verde"} className={input} />
          </label>
        </Section>

        <Section title="Tipo di avviso" help="Esiti, affidamenti diretti e modifiche contrattuali sono sempre esclusi: non ci si può più candidare." className={hl("tipologie")}>
          {Object.entries(ANAC_TIPOLOGIE).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-[13px]">
              <input type="checkbox" name="tipologie" value={value} defaultChecked={f.tipologie.includes(value)} />
              {label}
            </label>
          ))}
        </Section>

        <Section title="Importo" help="Gli avvisi senza importo indicato non vengono esclusi dai limiti." className={changed.has("importoMin") || changed.has("importoMax") ? hl("importoMin") || hl("importoMax") : ""}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-semibold">Importo minimo (€)</span>
              <input type="number" name="importo_min" min={0} step="any" defaultValue={f.importoMin ?? ""} className={input} />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-semibold">Importo massimo (€)</span>
              <input type="number" name="importo_max" min={0} step="any" defaultValue={f.importoMax ?? ""} className={input} />
            </label>
          </div>
        </Section>

        <Section title="Periodo e scadenze" className={hl("giorniIndietro") || hl("soloAperti")}>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" name="solo_aperti" defaultChecked={f.soloAperti} />
            Solo avvisi con scadenza non ancora passata
          </label>
          <label className="flex flex-wrap items-center gap-2 text-[13px]">
            Cerca negli avvisi pubblicati negli ultimi
            <input type="number" name="giorni_indietro" min={1} max={60} defaultValue={f.giorniIndietro} className={`${input} w-20 py-1`} />
            giorni
          </label>
          <p className="text-[11px] text-muted">
            Se cambi i filtri, il controllo successivo ricerca di nuovo in tutto questo periodo. Con gli stessi filtri riprende dall&apos;ultimo controllo.
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

      {/* Esito dei controlli */}
      <section className="mt-8">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-1.5">
          <h2 className="text-[11px] font-semibold tracking-[0.03em] text-muted uppercase">Controlli per {lastProfileName}</h2>
          {settings && (
            <form action={runAnacNow.bind(null, profile.id)}>
              <SubmitButton variant="secondary" pendingLabel="Controllo in corso…" pendingHint={WAIT}>
                Controlla ora con i filtri salvati
              </SubmitButton>
            </form>
          )}
        </div>
        {runs.length === 0 ? (
          <p className="mt-2 text-xs text-muted">Nessun controllo ancora eseguito per questo profilo.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2 text-xs">
            {runs.map((r) => (
              <li key={r.id} className={`rounded-control px-3 py-2 ${r === last ? "bg-panel" : ""}`}>
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <Pill tone={r.status === "completato" ? "go" : r.status === "errore" ? "nogo" : "neutral"}>{r.status}</Pill>
                  <strong>{dateTime(r.started_at)}</strong>
                  <span className="text-muted">
                    avvisi pubblicati dal {date(r.window_from)} al {date(r.window_to)}
                  </span>
                </div>
                {r.status === "completato" && (
                  <p className="mt-1">
                    Letti <strong>{r.found}</strong> avvisi · <strong>{r.inserted}</strong> bandi nuovi · {r.updated} aggiornati · {r.skipped} già presenti
                    {r.inserted + r.updated > 0 && (
                      <>
                        {" "}
                        ·{" "}
                        <Link href={`/novita?profilo=${profile.id}`} className="underline">
                          vedi nelle Novità
                        </Link>
                      </>
                    )}
                  </p>
                )}
                {r.message && <p className="mt-0.5 text-[11px] text-muted">{r.message}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="mt-6 text-[11px] text-muted">Il servizio ANAC usato è la versione «v0», non documentata: se ANAC lo cambia, il lettore va aggiornato.</p>
    </div>
  );
}

function Section({
  title,
  help,
  className = "",
  children,
}: {
  title: string;
  help?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`flex flex-col gap-2 ${className}`}>
      <h3 className="border-b border-line pb-1.5 text-[11px] font-semibold tracking-[0.03em] text-muted uppercase">{title}</h3>
      {help && <p className="-mt-0.5 text-[11px] text-muted">{help}</p>}
      {children}
    </section>
  );
}
