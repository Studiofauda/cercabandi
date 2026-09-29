import Link from "next/link";
import { findCombinations } from "@/core/combinations";
import { evaluate } from "@/core/scoring";
import type { Opportunity } from "@/core/types";
import { getAssessmentNote, getDismissals, getOpportunities, getProfiles, getRevisions, getSources } from "@/lib/db/queries";
import { OpportunityCard, ProfileChips } from "@/components/OpportunityCard";
import { DetailPanel } from "./DetailPanel";

/** Prima i bandi utilizzabili, poi quelli chiusi; a parità, il punteggio più alto. */
const STATUS_ORDER: Record<Opportunity["status"], number> = { Aperto: 0, "In arrivo": 1, Chiuso: 2 };

type Search = { profilo?: string; tutti?: string; bando?: string; errore?: string };

function href(params: Search) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `/opportunita?${s}` : "/opportunita";
}

export default async function OpportunitaPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { profilo, tutti, bando, errore } = await searchParams;
  const [profiles, opportunities, sources] = await Promise.all([getProfiles(), getOpportunities(), getSources()]);

  if (profiles.length === 0) {
    return (
      <div className="mx-auto max-w-4xl">
        <h1 className="text-[21px] font-bold tracking-[-0.01em]">Opportunità</h1>
        <p className="mt-2 text-muted">Non c&apos;è ancora nessun profilo: i punteggi si calcolano rispetto a un profilo.</p>
      </div>
    );
  }

  const profile = profiles.find((p) => p.profile.id === profilo)?.profile ?? profiles[0].profile;
  const showAll = tutti === "1";
  const now = new Date();
  const dismissals = await getDismissals(profile.id);
  const base: Search = { profilo: profile.id, tutti: showAll ? "1" : undefined };

  const evaluated = opportunities.map(({ opportunity, row }) => ({
    o: opportunity,
    row,
    e: evaluate(profile, opportunity, now),
    dismissed: dismissals.has(opportunity.id),
  }));
  const hidden = evaluated.filter(({ e }) => e.verdict === "Non applicabile").length;
  const rows = evaluated
    .filter(({ e }) => showAll || e.verdict !== "Non applicabile")
    .sort(
      (a, b) =>
        Number(a.dismissed) - Number(b.dismissed) ||
        STATUS_ORDER[a.o.status] - STATUS_ORDER[b.o.status] ||
        b.e.score - a.e.score
    );

  const selected = evaluated.find(({ o }) => o.id === bando);
  const [note, revisions] = selected
    ? await Promise.all([getAssessmentNote(selected.o.id, profile.id), getRevisions(selected.o.id)])
    : [null, []];
  const allOpportunities = new Map(evaluated.map(({ o }) => [o.id, o]));
  // Anche le combinazioni da escludere: nel dettaglio serve sapere perché due bandi non stanno insieme.
  const combinations = selected
    ? findCombinations(profile, [...allOpportunities.values()], { includeRejected: true }).filter((f) =>
        f.opportunityIds.includes(selected.o.id)
      )
    : [];

  return (
    <div className="mx-auto max-w-4xl">
      <ProfileChips profiles={profiles.map((p) => p.profile)} activeId={profile.id} hrefFor={(id) => href({ profilo: id })} />

      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="flex items-center gap-3 text-[21px] font-bold tracking-[-0.01em]">
          Opportunità
          <Link href="/bandi/nuovo" className="rounded-control bg-ink px-2.5 py-1 text-xs font-semibold tracking-normal text-lime">
            + Nuovo bando
          </Link>
        </h1>
        <p className="text-xs text-muted">
          Punteggio e verdetto calcolati per <strong className="text-ink">{profile.name}</strong> · {rows.length} opportunità
        </p>
      </div>

      {hidden > 0 && (
        <p className="mt-1 text-xs text-muted">
          <Link href={href({ ...base, tutti: showAll ? undefined : "1" })} className="underline">
            {showAll
              ? `Nascondi i ${hidden} bandi non pertinenti per questo profilo`
              : `Mostra anche ${hidden} bandi non pertinenti per questo profilo`}
          </Link>
        </p>
      )}

      <ul className="mt-4 flex flex-col gap-2.5">
        {rows.map(({ o, row, e, dismissed }) => (
          <li key={o.id}>
          <OpportunityCard
            opportunity={o}
            row={row}
            evaluation={e}
            dismissed={dismissed}
            href={href({ ...base, bando: o.id })}
            now={now}
          />
          </li>
        ))}
      </ul>

      {selected && (
        <DetailPanel
          opportunity={selected.o}
          row={selected.row}
          evaluation={selected.e}
          profile={profile}
          source={sources.find((s) => s.source.id === selected.o.sourceId)?.source}
          dismissal={dismissals.get(selected.o.id)}
          note={note}
          revisions={revisions}
          closeHref={href(base)}
          selfHref={href({ ...base, bando: selected.o.id })}
          error={errore}
          now={now}
          combinations={combinations}
          allOpportunities={allOpportunities}
          hrefFor={(id) => href({ ...base, bando: id })}
        />
      )}
    </div>
  );
}
