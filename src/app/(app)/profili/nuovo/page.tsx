import Link from "next/link";
import { Interview } from "../Interview";
import { createProfileFromInterview } from "../actions";

export default function NuovoProfiloPage() {
  return (
    <div>
      <Link href="/profili" className="text-xs text-muted hover:text-ink">
        ← Profili
      </Link>
      <h1 className="mt-2 mb-5 text-[21px] font-bold tracking-[-0.01em]">Nuovo profilo</h1>
      <Interview onSave={createProfileFromInterview} submitLabel="Crea il profilo" />
    </div>
  );
}
