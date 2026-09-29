import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSources } from "@/lib/db/queries";
import type { OpportunityRow } from "@/lib/db/mappers";
import { BandoForm, FORM_ERRORS } from "../../BandoForm";
import { updateOpportunity } from "../../actions";

export default async function ModificaBandoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ errore?: string; back?: string }>;
}) {
  const { id } = await params;
  const { errore, back } = await searchParams;
  const supabase = await createClient();
  const { data: row } = await supabase.from("opportunities").select("*").eq("id", id).maybeSingle();
  if (!row) notFound();
  const sources = (await getSources()).map((s) => s.row);
  const returnTo = back && back.startsWith("/") && !back.startsWith("//") ? back : `/opportunita?bando=${id}`;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={returnTo} className="text-xs text-muted hover:text-ink">
        ← Torna al bando
      </Link>
      <h1 className="mt-2 text-[21px] leading-tight font-bold tracking-[-0.01em]">Modifica dati del bando</h1>
      <p className="mt-1 text-xs text-muted">{(row as OpportunityRow).title}</p>
      {errore && <p className="mt-3 rounded-control bg-nogo/10 px-3 py-2 text-xs text-red">{FORM_ERRORS[errore] ?? `Modifiche non salvate: ${errore}`}</p>}
      <BandoForm action={updateOpportunity.bind(null, id)} row={row as OpportunityRow} sources={sources} back={returnTo} submitLabel="Salva le modifiche" />
    </div>
  );
}
