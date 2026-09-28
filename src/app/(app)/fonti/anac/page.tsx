import Link from "next/link";
import { getConnectorFilters, getRuns } from "@/lib/db/queries";
import { ANAC_TIPOLOGIE, CPV_PRESETS, DEFAULT_ANAC_FILTERS, type AnacFilters } from "@/lib/ingestion/anac";
import { REGIONI, regioneBreve } from "@/lib/geo";
import { date } from "@/lib/format";
import { Pill } from "@/components/Pill";
import { runAnacNow, saveAnacFilters } from "./actions";

// Il controllo legge ANAC e scrive nel database: può richiedere qualche decina di secondi.
export const maxDuration = 60;

const input = "rounded-control border border-line px-3 py-2 text-[13.5px] outline-none focus:border-ink";

export default async function AnacPage({ searchParams }: { searchParams: Promise<{ salvato?: string; errore?: string }> }) {
  const { salvato, errore } = await searchParams;
  const [settings, runs] = await Promise.all([getConnectorFilters("anac"), getRuns("anac")]);
  const f: AnacFilters = { ...DEFAULT_ANAC_FILTERS, ...((settings?.filters as Partial<AnacFilters>) ?? {}) };
  const presetCodes = new Set(CPV_PRESETS.map((p) => p.code));
  const otherCpv = f.cpv.filter((c) => !presetCodes.has(c));

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/fonti" className="text-xs text-muted hover:text-ink">
        ← Fonti
      </Link>
      <h1 className="mt-2 text-[21px] font-bold tracking-[-0.01em]">ANAC · Pubblicità legale</h1>
      <p className="mt-1 text-xs text-muted">
        Dal 2024 raccoglie gli avvisi di tutte le stazioni appaltanti italiane, compresi MIT e Province. Qui scegli quali avvisi portare in Cerca Bandi.
      </p>

      {salvato && <p className="mt-3 rounded-control bg-go/20 px-3 py-2 text-xs text-go-ink">Filtri salvati. Valgono dal prossimo controllo.</p>}
      {errore && (
        <p className="mt-3 rounded-control bg-nogo/10 px-3 py-2 text-xs text-red">
          {errore === "cpv" ? "Indica almeno un codice CPV." : errore === "salvataggio" ? "Filtri non salvati: controlla di avere i permessi di modifica e che il database sia aggiornato." : `Controllo non riuscito: ${errore}`}
        </p>
      )}

      <section className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-card bg-panel px-4 py-3">
        <div className="text-xs">
          {runs[0] ? (
            <>
              Ultimo controllo: <strong>{date(runs[0].started_at)}</strong> ·{" "}
              {runs[0].status === "completato" ? `${runs[0].inserted} nuovi, ${runs[0].updated} aggiornati` : runs[0].status}
            </>
          ) : (
            "Nessun controllo ancora eseguito."
          )}
        </div>
        <form action={runAnacNow}>
          <button className="rounded-control bg-ink px-4 py-2 text-[13px] font-semibold text-lime">Controlla ora</button>
        </form>
      </section>

      <form action={saveAnacFilters} className="mt-5 flex flex-col gap-6">
        <Section title="Tipo di servizio (codici CPV)" help="Si prende ogni avviso con almeno un lotto in queste famiglie. Un prefisso di 3 cifre include tutta la famiglia.">
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

        <Section title="Regioni" help="Un avviso senza luogo certo viene tenuto e segnato «luogo da verificare». Nessuna regione selezionata = tutta Italia.">
          <div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-3">
            {REGIONI.map((r) => (
              <label key={r} className="flex items-center gap-2 text-[13px]">
                <input type="checkbox" name="regioni" value={regioneBreve(r)} defaultChecked={f.regioni.includes(regioneBreve(r)) || f.regioni.includes(r)} />
                {regioneBreve(r)}
              </label>
            ))}
          </div>
        </Section>

        <Section title="Tipo di avviso" help="Esiti, affidamenti diretti e modifiche contrattuali sono sempre esclusi: non ci si può più candidare.">
          {Object.entries(ANAC_TIPOLOGIE).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-[13px]">
              <input type="checkbox" name="tipologie" value={value} defaultChecked={f.tipologie.includes(value)} />
              {label}
            </label>
          ))}
        </Section>

        <Section title="Importo e parole" help="Gli avvisi senza importo indicato non vengono esclusi dai limiti di importo.">
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
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold">Escludi gli avvisi che contengono (una parola o frase per riga)</span>
            <textarea name="escludi" rows={3} defaultValue={f.escludi.join("\n")} placeholder={"manutenzione del verde\nfrazionamento catastale"} className={input} />
          </label>
        </Section>

        <Section title="Altre opzioni">
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" name="solo_aperti" defaultChecked={f.soloAperti} />
            Solo avvisi con scadenza non ancora passata
          </label>
          <label className="flex items-center gap-2 text-[13px]">
            Al primo controllo guarda gli ultimi
            <input type="number" name="giorni_indietro" min={1} max={60} defaultValue={f.giorniIndietro} className={`${input} w-20 py-1`} />
            giorni
          </label>
          <p className="text-[11px] text-muted">I controlli successivi riprendono dall&apos;ultimo eseguito, con un giorno di sovrapposizione.</p>
        </Section>

        <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t border-line bg-paper px-4 py-3">
          <span className="text-[11px] text-muted">{settings ? `Filtri aggiornati il ${date(settings.updated_at)}` : "Filtri iniziali"}</span>
          <button className="rounded-control bg-ink px-4 py-2 text-[13px] font-semibold text-lime">Salva i filtri</button>
        </div>
      </form>

      {runs.length > 0 && (
        <section className="mt-8">
          <h2 className="border-b border-line pb-1.5 text-[11px] font-semibold tracking-[0.03em] text-muted uppercase">Controlli eseguiti</h2>
          <ul className="mt-2 flex flex-col gap-1.5 text-xs">
            {runs.map((r) => (
              <li key={r.id} className="flex flex-wrap items-baseline gap-x-2">
                <Pill tone={r.status === "completato" ? "go" : r.status === "errore" ? "nogo" : "neutral"}>{r.status}</Pill>
                <span>{date(r.started_at)}</span>
                <span className="text-muted">
                  avvisi dal {date(r.window_from)} al {date(r.window_to)} · letti {r.found} · nuovi {r.inserted} · aggiornati {r.updated}
                </span>
                {r.message && <span className="w-full text-[11px] text-muted">{r.message}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="mt-6 text-[11px] text-muted">Il servizio ANAC usato è la versione «v0», non documentata: se ANAC lo cambia, il lettore va aggiornato.</p>
    </div>
  );
}

function Section({ title, help, children }: { title: string; help?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="border-b border-line pb-1.5 text-[11px] font-semibold tracking-[0.03em] text-muted uppercase">{title}</h2>
      {help && <p className="-mt-0.5 text-[11px] text-muted">{help}</p>}
      {children}
    </section>
  );
}
