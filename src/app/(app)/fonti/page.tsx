import Link from "next/link";
import type { Source } from "@/core/types";
import { getProfiles, getRuns, getSources } from "@/lib/db/queries";
import { PACK_LABELS } from "@/lib/labels";
import { date } from "@/lib/format";
import { Pill, type Tone } from "@/components/Pill";
import { sourceFeedback } from "./actions";

const RELIABILITY_TONE: Record<Source["reliability"], Tone> = {
  Ufficiale: "go",
  Istituzionale: "investigate",
  Secondaria: "neutral",
};

/** L'affidabilità ordina l'elenco (requisiti v3): prima le fonti ufficiali. */
const RELIABILITY_ORDER: Record<Source["reliability"], number> = { Ufficiale: 0, Istituzionale: 1, Secondaria: 2 };

export default async function FontiPage({ searchParams }: { searchParams: Promise<{ profilo?: string }> }) {
  const { profilo } = await searchParams;
  const [sources, profiles, anacRuns, sediaRuns] = await Promise.all([getSources(), getProfiles(), getRuns("anac", 1), getRuns("sedia", 1)]);
  const lastAnac = anacRuns[0];
  const lastSedia = sediaRuns[0];
  const profile = profiles.find((p) => p.profile.id === profilo)?.profile;

  // Una fonte è pertinente se è di base comune o condivide almeno un ambito con il profilo.
  const pertinent = (s: Source) => s.scope === "Base comune" || !profile || s.packs.some((p) => profile.packs.includes(p));
  const list = sources
    .map(({ source }) => source)
    .filter(pertinent)
    .sort(
      (a, b) =>
        Number(a.scope !== "Base comune") - Number(b.scope !== "Base comune") ||
        RELIABILITY_ORDER[a.reliability] - RELIABILITY_ORDER[b.reliability] ||
        a.name.localeCompare(b.name)
    );

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-[21px] font-bold tracking-[-0.01em]">Fonti</h1>
        <p className="text-xs text-muted">
          {list.length} fonti {profile ? `pertinenti per ${profile.name}` : "monitorate"}
        </p>
      </div>

      <section className="mt-4 rounded-card border border-ink bg-panel px-4 py-3">
        <h2 className="text-[11px] font-semibold tracking-[0.03em] text-muted uppercase">Controllo automatico</h2>
        {[
          { key: "anac", name: "ANAC · Pubblicità legale", what: "gare d'appalto di tutte le stazioni appaltanti italiane", last: lastAnac },
          { key: "sedia", name: "Funding & Tenders", what: "contributi europei diretti (Horizon, LIFE, Erasmus+, CERV…)", last: lastSedia },
        ].map((c) => (
          <div key={c.key} className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-2 first-of-type:border-t-0">
            <div className="text-[13px]">
              <strong>{c.name}</strong> <Pill tone="go">attivo</Pill>
              <span className="ml-1 text-xs text-muted">{c.what}</span>
              <p className="text-xs text-muted">
                {c.last
                  ? `Ultimo controllo ${date(c.last.started_at)} (${c.last.triggered_by ? "manuale" : "automatico"}): ${c.last.inserted} nuovi, ${c.last.updated} aggiornati`
                  : "Nessun controllo ancora eseguito"}
              </p>
            </div>
            <Link href={`/fonti/${c.key}${profile ? `?profilo=${profile.id}` : ""}`} className="rounded-control bg-ink px-3 py-1.5 text-xs font-semibold text-lime">
              Ricerche per profilo →
            </Link>
          </div>
        ))}
        <p className="mt-2 text-[11px] text-muted">
          Le ricerche salvate vengono controllate da sole ogni mattina verso le 7. Le altre fonti si consultano dai link qui sotto; TED è in pausa (le gare
          italiane arrivano già da ANAC).
        </p>
      </section>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <Link href="/fonti" className={`rounded-full border px-3 py-1 font-semibold ${!profile ? "border-ink bg-ink text-paper" : "border-line"}`}>
          Tutte
        </Link>
        {profiles.map(({ profile: p }) => (
          <Link
            key={p.id}
            href={`/fonti?profilo=${p.id}`}
            className={`rounded-full border px-3 py-1 font-semibold ${profile?.id === p.id ? "border-ink bg-ink text-paper" : "border-line hover:border-ink"}`}
          >
            Pertinenti per {p.name}
          </Link>
        ))}
      </div>

      <ul className="mt-4 flex flex-col divide-y divide-line rounded-card border border-line bg-paper">
        {list.map((s) => (
          <li key={s.id} className="grid gap-3 px-4 py-3 md:grid-cols-[1fr_auto]">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <a href={s.url} target="_blank" rel="noreferrer" className="text-[14.5px] font-bold hover:underline">
                  {s.name} ↗
                </a>
                <Pill tone={s.scope === "Base comune" ? "closed" : "neutral"}>{s.scope}</Pill>
                <Pill tone={RELIABILITY_TONE[s.reliability]}>{s.reliability}</Pill>
                {s.hasApi && <Pill tone="go">API</Pill>}
              </div>
              <p className="mt-0.5 text-xs text-ink-soft">{s.covers}</p>
              <p className="mt-1 text-[11px] text-muted">
                {s.level} · Metodo: {s.method}
                {s.lastCheckedAt ? ` · Ultimo controllo ${date(s.lastCheckedAt)}` : ""}
              </p>
              {s.packs.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {s.packs.map((p) => (
                    <span key={p} className="rounded-full bg-panel px-2 py-0.5 text-[10.5px]">
                      {PACK_LABELS[p]}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <form action={sourceFeedback} className="flex items-center gap-1.5 self-center text-xs">
              <input type="hidden" name="sourceId" value={s.id} />
              <span className="text-muted">Utile?</span>
              <button name="useful" value="1" className="rounded-control border border-line px-2 py-1 hover:border-ink" title="Utile">
                👍 {s.feedback?.useful ?? 0}
              </button>
              <button name="useful" value="0" className="rounded-control border border-line px-2 py-1 hover:border-ink" title="Non utile">
                👎 {s.feedback?.notUseful ?? 0}
              </button>
            </form>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs text-muted">
        Metodo di accesso e vincoli d&apos;uso di ogni fonte sono documentati in docs/censimento-fonti.md.
      </p>
    </div>
  );
}
