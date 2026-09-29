import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { date } from "@/lib/format";
import { Pill } from "@/components/Pill";
import { SubmitButton } from "@/components/SubmitButton";
import { addMember, changeRole, removeMember } from "./actions";

const ROLE_LABEL = {
  admin: "Amministratore: tutto, compresa la gestione delle persone",
  editor: "Editor: modifica bandi, profili, ricerche e note",
  viewer: "Sola lettura: consulta, non modifica",
} as const;

const ERRORS: Record<string, string> = {
  email: "Indirizzo email non valido.",
  ruolo: "Ruolo non valido.",
  permessi: "Solo un amministratore può gestire le persone.",
  account: "Non è stato possibile creare o ritrovare l'account: controlla che la chiave segreta di Supabase sia configurata su Vercel.",
  membro: "Operazione non riuscita sul database: controlla di essere amministratore.",
  "ultimo-admin": "Non puoi togliere a te stesso il ruolo di amministratore.",
};

export default async function UtentiPage({ searchParams }: { searchParams: Promise<{ aggiunto?: string; errore?: string }> }) {
  const { aggiunto, errore } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: members } = await supabase.from("workspace_members").select("user_id, role, created_at").order("created_at");
  const me = members?.find((m) => m.user_id === user?.id);
  const isAdmin = me?.role === "admin";

  // Le email dei colleghi stanno negli account, leggibili solo con la chiave segreta.
  const emails = new Map<string, { email: string; lastSignIn: string | null }>();
  try {
    const admin = createAdminClient();
    for (const m of members ?? []) {
      const { data } = await admin.auth.admin.getUserById(m.user_id);
      if (data.user) emails.set(m.user_id, { email: data.user.email ?? "—", lastSignIn: data.user.last_sign_in_at ?? null });
    }
  } catch {
    // Senza chiave segreta si mostrano solo i ruoli.
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-[21px] font-bold tracking-[-0.01em]">Persone che usano Cerca Bandi</h1>
      <p className="mt-1 text-xs text-muted">L&apos;accesso è solo su invito: chi non è in questo elenco non vede nulla, nemmeno conoscendo l&apos;indirizzo del sito.</p>

      {aggiunto && (
        <div className="mt-4 rounded-card border-2 border-green bg-go/15 px-4 py-3 text-[13px]">
          <p className="font-bold">✓ {aggiunto} può ora accedere.</p>
          <p className="mt-1 text-xs">
            Mandale o mandagli l&apos;indirizzo del sito: dalla pagina di accesso inserisce la sua email e riceve il link per entrare. Il link va aperto dallo stesso browser
            in cui è stato richiesto.
          </p>
        </div>
      )}
      {errore && <p className="mt-4 rounded-control bg-nogo/10 px-3 py-2 text-xs text-red">{ERRORS[errore] ?? errore}</p>}

      <ul className="mt-5 flex flex-col divide-y divide-line rounded-card border border-line bg-paper">
        {(members ?? []).map((m) => {
          const info = emails.get(m.user_id);
          const self = m.user_id === user?.id;
          return (
            <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="font-semibold">
                  {info?.email ?? "Utente"} {self && <span className="text-xs text-muted">(tu)</span>}
                </p>
                <p className="text-[11px] text-muted">
                  Aggiunto il {date(m.created_at)} · {info?.lastSignIn ? `ultimo accesso ${date(info.lastSignIn)}` : "non ha ancora fatto accesso"}
                </p>
              </div>
              {isAdmin && !self ? (
                <div className="flex flex-wrap items-center gap-2">
                  <form action={changeRole.bind(null, m.user_id)} className="flex items-center gap-1">
                    <select name="role" defaultValue={m.role} className="rounded-control border border-line bg-paper px-2 py-1 text-xs">
                      <option value="admin">Amministratore</option>
                      <option value="editor">Editor</option>
                      <option value="viewer">Sola lettura</option>
                    </select>
                    <button className="rounded-control border border-line px-2 py-1 text-xs hover:border-ink">Cambia</button>
                  </form>
                  <form action={removeMember.bind(null, m.user_id)}>
                    <button className="rounded-control border border-red px-2 py-1 text-xs text-red hover:bg-red hover:text-paper">Togli accesso</button>
                  </form>
                </div>
              ) : (
                <Pill tone={m.role === "admin" ? "indirect" : m.role === "editor" ? "go" : "neutral"}>
                  {m.role === "admin" ? "Amministratore" : m.role === "editor" ? "Editor" : "Sola lettura"}
                </Pill>
              )}
            </li>
          );
        })}
      </ul>

      {isAdmin ? (
        <form action={addMember} className="mt-6 rounded-card bg-panel px-4 py-4">
          <h2 className="text-[11px] font-semibold tracking-[0.03em] text-muted uppercase">Aggiungi una persona</h2>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-xs">
              <span className="font-semibold">Email</span>
              <input name="email" type="email" required placeholder="nome@studiofauda.com" className="rounded-control border border-line bg-paper px-3 py-2 text-[13.5px] outline-none focus:border-ink" />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-semibold">Ruolo</span>
              <select name="role" defaultValue="editor" className="rounded-control border border-line bg-paper px-3 py-2 text-[13.5px]">
                <option value="editor">Editor</option>
                <option value="viewer">Sola lettura</option>
                <option value="admin">Amministratore</option>
              </select>
            </label>
            <SubmitButton pendingLabel="Aggiunta in corso…">Aggiungi</SubmitButton>
          </div>
          <ul className="mt-3 flex flex-col gap-0.5 text-[11px] text-muted">
            {Object.values(ROLE_LABEL).map((l) => (
              <li key={l}>· {l}</li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-muted">
            Nessuna email di invito viene spedita: la persona entra dalla pagina di accesso con il link che riceve per email. Perché il link arrivi a indirizzi diversi dal
            tuo serve il servizio email configurato in Supabase.
          </p>
        </form>
      ) : (
        <p className="mt-6 text-xs text-muted">Solo un amministratore può aggiungere o togliere persone.</p>
      )}
    </div>
  );
}
