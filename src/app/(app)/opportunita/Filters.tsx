"use client";

import Form from "next/form";
import Link from "next/link";

/*
 * Barra dei filtri di Opportunità. È un normale modulo GET: i filtri finiscono nell'indirizzo
 * della pagina, quindi si possono salvare nei preferiti o mandare a un collega. Le tendine
 * applicano il filtro appena cambiano; il testo si cerca con Invio o con il bottone.
 */

export type FilterValues = {
  q?: string;
  stato?: string;
  verdetto?: string;
  tipo?: string;
  livello?: string;
  fonte?: string;
  scadenza?: string;
  scartati?: string;
};

export const STATUS_FILTERS = { attivi: "Aperti e in arrivo", Aperto: "Solo aperti", "In arrivo": "Solo in arrivo", Chiuso: "Solo chiusi", tutti: "Tutti gli stati" };
export const VERDICT_FILTERS = { "": "Tutti i verdetti", go: "Solo GO", buoni: "GO e GO condizionato", "no-nogo": "Escludi i NO-GO", incarico: "Solo incarichi tecnici" };
export const KIND_FILTERS = { "": "Tutti i tipi", contributo: "Contributi", gara: "Gare d'appalto", qualificazione: "Qualificazioni" };
export const LEVEL_FILTERS = { "": "Tutti i livelli", Europeo: "Europeo", Nazionale: "Nazionale", Regionale: "Regionale", Locale: "Locale" };
export const SOURCE_FILTERS = {
  "": "Tutte le provenienze",
  anac: "ANAC",
  sedia: "Bandi UE",
  feed: "Regione e fondazioni",
  manuale: "Inseriti a mano",
  prototipo: "Archivio iniziale",
};
export const DEADLINE_FILTERS = { "": "Qualsiasi scadenza", "30": "Entro 30 giorni", "60": "Entro 60 giorni", "90": "Entro 90 giorni" };

const field = "rounded-control border border-line bg-paper px-2 py-1.5 text-[12.5px] outline-none focus:border-ink";

function Select({ name, value, options, def }: { name: string; value?: string; options: Record<string, string>; def: string }) {
  const active = (value ?? def) !== def;
  return (
    <select name={name} defaultValue={value ?? def} className={`${field} ${active ? "border-ink bg-lime/40 font-semibold" : ""}`}>
      {Object.entries(options).map(([v, label]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </select>
  );
}

export function Filters({
  values,
  keep,
  shown,
  total,
  resetHref,
}: {
  values: FilterValues;
  /** Parametri da conservare (profilo, non pertinenti) che non sono filtri visibili. */
  keep: Record<string, string | undefined>;
  shown: number;
  total: number;
  resetHref: string;
}) {
  const filtered = shown !== total;
  return (
    <Form
      action="/opportunita"
      // Le tendine e la casella applicano il filtro subito; il testo aspetta Invio.
      onChange={(e) => {
        const target = e.target as unknown as HTMLInputElement;
        if (target.tagName !== "INPUT" || target.type === "checkbox") e.currentTarget.requestSubmit();
      }}
      className="mt-4 rounded-card border border-line bg-panel px-3 py-2.5"
    >
      {Object.entries(keep).map(([k, v]) => v && <input key={k} type="hidden" name={k} value={v} />)}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={values.q}
          placeholder="Cerca nel titolo, ente, tema, territorio…"
          className={`${field} min-w-[220px] flex-1 ${values.q ? "border-ink" : ""}`}
        />
        <button type="submit" className="rounded-control bg-ink px-3 py-1.5 text-xs font-semibold text-lime">
          Cerca
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Select name="stato" value={values.stato} options={STATUS_FILTERS} def="attivi" />
        <Select name="verdetto" value={values.verdetto} options={VERDICT_FILTERS} def="" />
        <Select name="tipo" value={values.tipo} options={KIND_FILTERS} def="" />
        <Select name="livello" value={values.livello} options={LEVEL_FILTERS} def="" />
        <Select name="fonte" value={values.fonte} options={SOURCE_FILTERS} def="" />
        <Select name="scadenza" value={values.scadenza} options={DEADLINE_FILTERS} def="" />
        <label className="flex items-center gap-1.5 text-[12.5px]">
          <input type="checkbox" name="scartati" value="1" defaultChecked={values.scartati === "1"} />
          Mostra gli scartati
        </label>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>
          {filtered ? (
            <>
              <strong className="text-ink">{shown}</strong> bandi su {total} con questi filtri
            </>
          ) : (
            <>{total} bandi</>
          )}
        </span>
        <Link href={resetHref} className="underline hover:text-ink">
          Torna ai filtri iniziali
        </Link>
      </div>
    </Form>
  );
}
