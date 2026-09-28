import Link from "next/link";
import { findCombinations } from "@/core/combinations";
import { getOpportunities, getProfiles } from "@/lib/db/queries";
import { CombinationCard, COMBINATION_DISCLAIMER } from "@/components/CombinationCard";

export default async function CumulabilitaPage({
  searchParams,
}: {
  searchParams: Promise<{ profilo?: string; escluse?: string }>;
}) {
  const { profilo, escluse } = await searchParams;
  const [profiles, opportunities] = await Promise.all([getProfiles(), getOpportunities()]);
  const profile = profiles.find((p) => p.profile.id === profilo)?.profile ?? profiles[0]?.profile;
  if (!profile) return <p className="text-muted">Serve almeno un profilo.</p>;

  const showRejected = escluse === "1";
  const opps = opportunities.map((o) => o.opportunity);
  const byId = new Map(opps.map((o) => [o.id, o]));
  const findings = findCombinations(profile, opps, { includeRejected: showRejected });
  const withoutExpenses = opps.filter((o) => o.status !== "Chiuso" && !o.expenseCategories?.length).length;
  const base = `/cumulabilita?profilo=${profile.id}`;

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-[21px] font-bold tracking-[-0.01em]">Cumulabilità</h1>
      <p className="mt-1 text-xs text-muted">
        Coppie di bandi che potrebbero finanziare lo stesso progetto coprendo voci di spesa diverse, per{" "}
        <strong className="text-ink">{profile.name}</strong>.
      </p>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {profiles.map(({ profile: p }) => (
          <Link
            key={p.id}
            href={`/cumulabilita?profilo=${p.id}${showRejected ? "&escluse=1" : ""}`}
            className={`rounded-full border px-3 py-1 font-semibold ${p.id === profile.id ? "border-ink bg-ink text-paper" : "border-line hover:border-ink"}`}
          >
            {p.name}
          </Link>
        ))}
      </div>

      <p className="mt-4 rounded-control bg-panel px-3 py-2 text-xs text-ink-soft">{COMBINATION_DISCLAIMER}</p>

      {withoutExpenses > 0 && (
        <p className="mt-2 text-xs text-warning-text">
          {withoutExpenses} bandi aperti non hanno ancora le voci di spesa: le loro combinazioni restano «da verificare». Si compilano dal pannello del bando, sezione «Dati per la cumulabilità».
        </p>
      )}

      <p className="mt-3 text-xs">
        <Link href={showRejected ? base : `${base}&escluse=1`} className="underline">
          {showRejected ? "Nascondi le combinazioni da escludere" : "Mostra anche le combinazioni da escludere, con il motivo"}
        </Link>
      </p>

      {findings.length === 0 ? (
        <p className="mt-4 text-muted">Nessuna combinazione tra i bandi accessibili a questo profilo.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2.5">
          {findings.map((f) => (
            <li key={f.opportunityIds.join("+")}>
              <CombinationCard finding={f} opportunities={byId} hrefFor={(id) => `/opportunita?profilo=${profile.id}&bando=${id}`} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
