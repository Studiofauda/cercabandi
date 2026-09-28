import { getOpportunities, getProfiles, getScenarios } from "@/lib/db/queries";
import type { ProfileParams } from "@/core/types";
import { Simulator } from "./Simulator";

const select = "rounded-control border border-line bg-paper px-3 py-2 text-[13.5px] outline-none focus:border-ink";

export default async function SimulazionePage({
  searchParams,
}: {
  searchParams: Promise<{ profilo?: string; bando?: string }>;
}) {
  const { profilo, bando } = await searchParams;
  const [profiles, opportunities] = await Promise.all([getProfiles(), getOpportunities()]);

  const profile = profiles.find((p) => p.profile.id === profilo)?.profile ?? profiles[0]?.profile;
  // Bandi ordinati: prima gli aperti, poi gli altri; il primo aperto è la scelta predefinita.
  const sorted = [...opportunities].sort(
    (a, b) => Number(a.opportunity.status === "Chiuso") - Number(b.opportunity.status === "Chiuso") || a.opportunity.title.localeCompare(b.opportunity.title)
  );
  const opportunity = sorted.find((o) => o.opportunity.id === bando)?.opportunity ?? sorted[0]?.opportunity;

  if (!profile || !opportunity) {
    return (
      <div className="mx-auto max-w-4xl">
        <h1 className="text-[21px] font-bold tracking-[-0.01em]">Simulazione</h1>
        <p className="mt-2 text-muted">Servono almeno un profilo e un bando.</p>
      </div>
    );
  }

  const saved = await getScenarios(profile.id, opportunity.id);

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-[21px] font-bold tracking-[-0.01em]">Cosa cambierebbe se…</h1>
      <p className="mt-1 text-xs text-muted">
        Cambia i parametri del profilo in una variante e guarda subito l&apos;effetto sul punteggio. Il profilo originale non viene modificato.
      </p>

      {/* Scelta di profilo e bando: un semplice modulo che ricarica la pagina. */}
      <form className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold tracking-[0.03em] text-muted uppercase">Profilo</span>
          <select name="profilo" defaultValue={profile.id} className={select}>
            {profiles.map(({ profile: p }) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[11px] font-semibold tracking-[0.03em] text-muted uppercase">Bando</span>
          <select name="bando" defaultValue={opportunity.id} className={`${select} w-full`}>
            {sorted.map(({ opportunity: o }) => (
              <option key={o.id} value={o.id}>
                {o.status === "Chiuso" ? "[chiuso] " : ""}
                {o.title}
              </option>
            ))}
          </select>
        </label>
        <button className="rounded-control bg-ink px-4 py-2 text-[13px] font-semibold text-lime">Mostra</button>
      </form>

      <div className="mt-5">
        <Simulator
          key={`${profile.id}-${opportunity.id}`}
          profile={profile}
          opportunity={opportunity}
          opportunities={opportunities.map((o) => o.opportunity)}
          saved={saved.map((s) => ({ id: s.id, label: s.label, params: s.params as Partial<ProfileParams> }))}
        />
      </div>
    </div>
  );
}
