import Link from "next/link";
import { getProfiles } from "@/lib/db/queries";
import { Pill } from "@/components/Pill";

export default async function ProfiliPage() {
  const profiles = await getProfiles();

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[21px] font-bold tracking-[-0.01em]">Profili</h1>
        <Link href="/profili/nuovo" className="rounded-control bg-ink px-3.5 py-2 text-[13px] font-semibold text-lime">
          + Nuovo profilo con l&apos;intervista
        </Link>
      </div>
      <p className="mt-1 text-xs text-muted">
        Ogni profilo è parametrico: tutti i dati si possono modificare per simulare soggetti diversi.
      </p>

      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {profiles.map(({ profile: p, row }) => {
          const sede = [p.params.comune?.value, p.params.provincia?.value, p.params.regione?.value].filter(Boolean).join(", ");
          return (
            <li key={p.id}>
              <Link href={`/profili/${p.id}`} className="flex h-full flex-col rounded-card border border-line bg-paper px-4 py-3.5 hover:border-ink">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ink text-[13px] font-bold text-lime">
                    {p.shortName}
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-[16px] leading-snug font-bold">{p.name}</h2>
                    <p className="text-xs text-muted">{p.organizationType}</p>
                    {sede && <p className="text-xs text-muted">{String(sede)}</p>}
                  </div>
                  {p.isTemplate && (
                    <span className="ml-auto">
                      <Pill tone="investigate">Modello</Pill>
                    </span>
                  )}
                </div>

                {p.themes.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.themes.slice(0, 4).map((t) => (
                      <span key={t} className="rounded-full bg-panel px-2 py-0.5 text-[11px]">
                        {t}
                      </span>
                    ))}
                    {p.themes.length > 4 && <span className="text-[11px] text-muted">+{p.themes.length - 4}</span>}
                  </div>
                )}

                {(row.evidence_ready.length > 0 || row.evidence_missing.length > 0) && (
                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="font-semibold text-positive-text">Pronto</div>
                      <ul className="mt-1 list-disc pl-4 text-ink-soft">
                        {row.evidence_ready.slice(0, 3).map((e) => (
                          <li key={e}>{e}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="font-semibold text-warning-text">Manca</div>
                      <ul className="mt-1 list-disc pl-4 text-ink-soft">
                        {row.evidence_missing.slice(0, 3).map((e) => (
                          <li key={e}>{e}</li>
                        ))}
                      </ul>
                      {row.evidence_missing.length > 3 && (
                        <p className="mt-0.5 text-muted">e altri {row.evidence_missing.length - 3}</p>
                      )}
                    </div>
                  </div>
                )}

                {p.notes && <p className="mt-3 text-xs text-muted italic">{p.notes}</p>}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
