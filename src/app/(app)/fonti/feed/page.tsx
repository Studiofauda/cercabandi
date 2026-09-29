import Link from "next/link";
import { getConnectorFilters, getProfiles, getRuns } from "@/lib/db/queries";
import { DEFAULT_FEED_FILTERS, FEED_SOURCES, type FeedFilters } from "@/lib/ingestion/feeds";
import { parseFeedQuery } from "@/lib/ingestion/nl-feed";
import { date } from "@/lib/format";
import { SubmitButton } from "@/components/SubmitButton";
import { ProfileSwitcher, RunsList, Section } from "@/components/SourceSearch";
import { runFeedNow, saveFeedFilters } from "./actions";

// Cinque fonti e, per la Compagnia di San Paolo, la pagina di ogni bando: fino a un minuto.
export const maxDuration = 60;

const input = "rounded-control border border-line px-3 py-2 text-[13.5px] outline-none focus:border-ink";
const WAIT = "Sto leggendo i siti di Regione, fondazioni e GSE: può richiedere fino a un minuto. Non chiudere la pagina.";

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ profilo?: string; q?: string; salvato?: string; errore?: string }>;
}) {
  const { profilo, q, salvato, errore } = await searchParams;
  const profiles = await getProfiles();
  const profile = profiles.find((p) => p.profile.id === profilo)?.profile ?? profiles[0]?.profile;
  if (!profile) return <p className="text-muted">Serve almeno un profilo: le ricerche sono legate ai profili.</p>;

  const [settings, runs] = await Promise.all([getConnectorFilters("feed", profile.id), getRuns("feed", 8, profile.id)]);
  const saved: FeedFilters = { ...DEFAULT_FEED_FILTERS, ...((settings?.filters as Partial<FeedFilters>) ?? {}) };
  const parsed = q?.trim() ? parseFeedQuery(q) : null;
  const f: FeedFilters = parsed ? { ...saved, ...parsed.patch } : saved;
  const changed = new Set(parsed ? Object.keys(parsed.patch).filter((k) => k !== "ricerca") : []);
  const hl = (...keys: Array<keyof FeedFilters>) => (keys.some((k) => changed.has(k)) ? "rounded-card bg-cond/30 px-3 py-2 ring-2 ring-ink" : "");

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/fonti" className="text-xs text-muted hover:text-ink">
        ← Fonti
      </Link>
      <h1 className="mt-2 text-[21px] font-bold tracking-[-0.01em]">Ricerca su Regione Piemonte, fondazioni e GSE</h1>
      <p className="mt-1 text-xs text-muted">
        Contributi della Regione Piemonte, bandi di Compagnia di San Paolo, Fondazione CRT e Fondazione Con il Sud, incentivi GSE per l&apos;energia. Ogni profilo
        ha la sua ricerca; quelle salvate vengono controllate da sole ogni mattina.
      </p>

      <ProfileSwitcher profiles={profiles.map((p) => p.profile)} active={profile} hrefFor={(id) => `/fonti/feed?profilo=${id}`} hasSearch={!!settings} />

      {salvato && <p className="mt-3 rounded-control bg-go/20 px-3 py-2 text-xs text-go-ink">Filtri di {profile.name} salvati. Valgono dal prossimo controllo.</p>}
      {errore && (
        <p className="mt-3 rounded-control bg-nogo/10 px-3 py-2 text-xs text-red">
          {errore === "fonti"
            ? "Scegli almeno una fonte."
            : errore === "salvataggio"
              ? "Filtri non salvati: controlla di avere i permessi di modifica e che il database sia aggiornato."
              : `Controllo non riuscito: ${errore}`}
        </p>
      )}

      <section className="mt-4 rounded-card bg-panel px-4 py-3">
        <h2 className="text-[11px] font-semibold tracking-[0.03em] text-muted uppercase">2 · Descrivi cosa cerchi (facoltativo)</h2>
        <form className="mt-2 flex flex-wrap gap-2">
          <input type="hidden" name="profilo" value={profile.id} />
          <input name="q" defaultValue={q ?? saved.ricerca} placeholder="es. fondazioni su cultura e giovani tranne formazione" className={`${input} min-w-0 flex-1 bg-paper`} />
          <button className="rounded-control border border-ink bg-paper px-3 py-2 text-[13px] font-semibold">Interpreta</button>
        </form>
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

      <form action={saveFeedFilters.bind(null, profile.id)} className="mt-5 flex flex-col gap-6">
        <input type="hidden" name="ricerca" value={parsed ? q : saved.ricerca} />
        <h2 className="-mb-3 text-[11px] font-semibold tracking-[0.03em] text-muted uppercase">3 · Filtri</h2>

        <Section title="Fonti da seguire" className={hl("fonti")}>
          {FEED_SOURCES.map((s) => (
            <label key={s.key} className="flex items-start gap-2 text-[13px]">
              <input type="checkbox" name="fonti" value={s.key} defaultChecked={f.fonti.includes(s.key)} className="mt-1" />
              <span>
                <strong>{s.label}</strong>
                <span className="block text-[11px] text-muted">{s.territory}</span>
              </span>
            </label>
          ))}
        </Section>

        <Section title="Temi e parole" help="L'avviso deve contenere almeno una di queste parole o radici. Vuoto = nessun vincolo." className={hl("includi", "escludi")}>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold">Parole chiave: almeno una (una per riga)</span>
            <textarea name="includi" rows={3} defaultValue={f.includi.join("\n")} placeholder={"cultur\ngiovan\nrigenerazion"} className={input} />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold">Escludi gli avvisi che contengono (una per riga)</span>
            <textarea name="escludi" rows={2} defaultValue={f.escludi.join("\n")} placeholder="tirocini" className={input} />
          </label>
        </Section>

        <Section title="Altre opzioni" className={hl("soloAperti")}>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" name="solo_aperti" defaultChecked={f.soloAperti} />
            Solo bandi aperti (esclusi esiti, bandi scaduti e pagine vecchie senza scadenza)
          </label>
          <p className="text-[11px] text-muted">
            Le scadenze si ricavano dal testo del bando: quelle trovate sono indicate nelle note, e vanno sempre confermate sulla pagina ufficiale.
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
            <form action={runFeedNow.bind(null, profile.id)}>
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
