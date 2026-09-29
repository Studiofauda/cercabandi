import Link from "next/link";
import { getSources } from "@/lib/db/queries";
import { BandoForm, FORM_ERRORS } from "../BandoForm";
import { createOpportunity } from "../actions";

export default async function NuovoBandoPage({ searchParams }: { searchParams: Promise<{ errore?: string }> }) {
  const { errore } = await searchParams;
  const sources = (await getSources()).map((s) => s.row);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/opportunita" className="text-xs text-muted hover:text-ink">
        ← Opportunità
      </Link>
      <h1 className="mt-2 text-[21px] font-bold tracking-[-0.01em]">Nuovo bando</h1>
      <p className="mt-1 text-xs text-muted">
        Per i bandi segnalati da un cliente o trovati su un sito che Cercabandi non legge. Compila ciò che sai: i dati mancanti non bloccano la valutazione, allargano solo
        l&apos;intervallo del punteggio.
      </p>
      {errore && <p className="mt-3 rounded-control bg-nogo/10 px-3 py-2 text-xs text-red">{FORM_ERRORS[errore] ?? `Bando non salvato: ${errore}`}</p>}
      <BandoForm action={createOpportunity} sources={sources} back="/opportunita" submitLabel="Crea il bando" row={{ eligible_subject_types: ["ente-pubblico"] }} />
    </div>
  );
}
