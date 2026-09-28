import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { createClient } from "@/lib/supabase/server";

/**
 * Layout delle pagine riservate. Il controllo di accesso vero è nel database (RLS):
 * qui ci si limita a rimandare al login chi non è collegato e a spiegare cosa succede
 * a chi è collegato ma non è ancora stato aggiunto allo spazio di lavoro.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("role, workspaces(name)")
    .eq("user_id", user.id);

  const membership = memberships?.[0];

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar email={user.email ?? ""} />
      <main className="min-w-0 flex-1 px-4 py-5 md:px-[22px]">
        {membership ? (
          children
        ) : (
          <div className="mx-auto max-w-xl rounded-card border border-line bg-panel px-5 py-4">
            <h1 className="text-[16.5px] font-bold">Accesso non ancora abilitato</h1>
            <p className="mt-2 text-muted">
              Sei collegato come <strong className="text-ink">{user.email}</strong>, ma il tuo account non è
              ancora associato allo spazio di lavoro. Chiedi a un amministratore di aggiungerti.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
