import Link from "next/link";
import type { Profile } from "@/core/types";
import type { IngestionRunRow } from "@/lib/db/queries";
import { date, dateTime } from "@/lib/format";
import { Pill } from "./Pill";

/** Elementi comuni alle pagine di ricerca delle fonti (ANAC, Funding & Tenders). */

export function ProfileSwitcher({
  profiles,
  active,
  hrefFor,
  hasSearch,
}: {
  profiles: Profile[];
  active: Profile;
  hrefFor: (id: string) => string;
  hasSearch: boolean;
}) {
  return (
    <section className="mt-4 rounded-card border-2 border-ink px-4 py-3">
      <h2 className="text-[11px] font-semibold tracking-[0.03em] text-muted uppercase">1 · Stai cercando per</h2>
      <div className="mt-2 flex flex-wrap gap-2">
        {profiles.map((p) => {
          const on = p.id === active.id;
          return (
            <Link
              key={p.id}
              href={hrefFor(p.id)}
              className={`flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-[13px] font-semibold ${on ? "border-ink bg-ink text-paper" : "border-line hover:border-ink"}`}
            >
              <span className={`grid size-6 place-items-center rounded-full text-[10.5px] font-bold ${on ? "bg-lime text-ink" : "bg-panel"}`}>{p.shortName}</span>
              {p.name}
            </Link>
          );
        })}
      </div>
      <p className="mt-2 text-xs">
        Filtri e controlli qui sotto riguardano <strong>{active.name}</strong>
        {hasSearch ? "" : " (non ha ancora una ricerca salvata: sono proposti i filtri iniziali)"}.
      </p>
    </section>
  );
}

export function Section({ title, help, className = "", children }: { title: string; help?: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={`flex flex-col gap-2 ${className}`}>
      <h3 className="border-b border-line pb-1.5 text-[11px] font-semibold tracking-[0.03em] text-muted uppercase">{title}</h3>
      {help && <p className="-mt-0.5 text-[11px] text-muted">{help}</p>}
      {children}
    </section>
  );
}

export function RunsList({ runs, profileId, showWindow }: { runs: IngestionRunRow[]; profileId: string; showWindow: boolean }) {
  if (runs.length === 0) return <p className="mt-2 text-xs text-muted">Nessun controllo ancora eseguito per questo profilo.</p>;
  return (
    <ul className="mt-2 flex flex-col gap-2 text-xs">
      {runs.map((r, i) => (
        <li key={r.id} className={`rounded-control px-3 py-2 ${i === 0 ? "bg-panel" : ""}`}>
          <div className="flex flex-wrap items-baseline gap-x-2">
            <Pill tone={r.status === "completato" ? "go" : r.status === "errore" ? "nogo" : "neutral"}>{r.status}</Pill>
            <strong>{dateTime(r.started_at)}</strong>
            <span className="text-muted">{r.triggered_by ? "manuale" : "automatico"}</span>
            {showWindow && (
              <span className="text-muted">
                avvisi pubblicati dal {date(r.window_from)} al {date(r.window_to)}
              </span>
            )}
          </div>
          {r.status === "completato" && (
            <p className="mt-1">
              Letti <strong>{r.found}</strong> · <strong>{r.inserted}</strong> bandi nuovi · {r.updated} aggiornati · {r.skipped} già presenti
              {r.inserted + r.updated > 0 && (
                <>
                  {" "}
                  ·{" "}
                  <Link href={`/novita?profilo=${profileId}`} className="underline">
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
  );
}
