"use client";

import { useActionState, useState } from "react";
import { generateLoginLink, type LoginLinkState } from "./actions";

/**
 * Bottone «Genera link di accesso»: mostra il link da copiare e apre un messaggio già
 * pronto nel programma di posta di chi lo manda.
 */
export function LoginLink({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState<LoginLinkState, FormData>(generateLoginLink.bind(null, userId), {});
  const [copied, setCopied] = useState(false);

  const body = state.link
    ? `Ciao,\n\nti ho dato accesso a Cercabandi, lo strumento dello studio per trovare e valutare i bandi.\n\nPer entrare apri questo link personale:\n${state.link}\n\nIl link vale una sola volta e scade dopo qualche ora: aprilo dal browser che userai di solito. Dopo resterai collegato su quel browser.\nSe il link non funziona più, chiedimene uno nuovo.\n`
    : "";

  return (
    <div className="w-full">
      <form action={action}>
        <button disabled={pending} className="rounded-control border border-ink px-2 py-1 text-xs font-semibold hover:bg-ink hover:text-lime disabled:opacity-60">
          {pending ? "Genero il link…" : "Genera link di accesso"}
        </button>
      </form>
      {state.error && <p className="mt-2 text-xs text-red">{state.error}</p>}
      {state.link && (
        <div className="mt-2 rounded-control border-2 border-ink bg-paper px-3 py-2.5 text-xs">
          <p className="font-semibold">Link personale per {state.email}</p>
          <p className="mt-1 break-all rounded bg-panel px-2 py-1 font-mono text-[11px]">{state.link}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(state.link!).then(() => setCopied(true))}
              className="rounded-control bg-ink px-2.5 py-1 font-semibold text-lime"
            >
              {copied ? "✓ Copiato" : "Copia il link"}
            </button>
            <a
              href={`mailto:${state.email}?subject=${encodeURIComponent("Il tuo accesso a Cercabandi")}&body=${encodeURIComponent(body)}`}
              className="rounded-control border border-line px-2.5 py-1 font-semibold hover:border-ink"
            >
              Scrivi l&apos;email con il link
            </a>
          </div>
          <p className="mt-2 text-[11px] text-muted">
            Mandalo solo a questa persona: chi ha il link entra con il suo account. Vale una volta sola; se scade, generane uno nuovo.
          </p>
        </div>
      )}
    </div>
  );
}
