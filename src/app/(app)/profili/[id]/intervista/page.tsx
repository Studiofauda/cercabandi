import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfile } from "@/lib/db/queries";
import { Interview } from "../../Interview";
import { updateProfileFromInterview } from "../../actions";

/** Intervista rifatta su un profilo esistente, partendo dalle risposte già date. */
export default async function RifaiIntervistaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = await getProfile(id);
  if (!found) notFound();
  const { profile, row } = found;

  // Le risposte numeriche già segnate come stime restano stime.
  const estimates: Record<string, boolean> = {};
  for (const [key, p] of Object.entries(profile.params)) if (p?.confidence === "stimato") estimates[key] = true;

  return (
    <div>
      <Link href={`/profili/${id}`} className="text-xs text-muted hover:text-ink">
        ← {profile.name}
      </Link>
      <h1 className="mt-2 mb-5 text-[21px] font-bold tracking-[-0.01em]">Rifai l&apos;intervista</h1>
      <Interview
        initial={{
          answers: { subjectType: profile.subjectType, ...(profile.interviewAnswers ?? {}) },
          estimates,
          name: profile.name,
          shortName: profile.shortName,
          organizationType: profile.organizationType,
          packOverrides: { add: row.pack_overrides?.add ?? [], remove: row.pack_overrides?.remove ?? [] },
        }}
        onSave={updateProfileFromInterview.bind(null, id)}
        submitLabel="Aggiorna il profilo"
      />
    </div>
  );
}
