"use client";

import { useActionState } from "react";
import { sendMagicLink, type LoginState } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendMagicLink, { status: "idle" });

  return (
    <div className="grid min-h-screen place-items-center bg-ink px-4">
      <div className="w-full max-w-sm rounded-card bg-paper px-6 py-7">
        <div className="text-[26px] leading-none font-black tracking-tight">cercabandi</div>
        <div className="mt-1 text-xs text-muted">studiofauda</div>

        {state.status === "sent" ? (
          <div className="mt-6">
            <p className="font-semibold">Controlla la tua email.</p>
            <p className="mt-1 text-muted">
              Abbiamo inviato un link di accesso a <strong className="text-ink">{state.message}</strong>. Aprilo da
              questo stesso browser.
            </p>
          </div>
        ) : (
          <form action={action} className="mt-6 flex flex-col gap-3">
            <label htmlFor="email" className="text-[11px] font-semibold tracking-[0.03em] text-muted uppercase">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="rounded-control border border-line px-3 py-2 text-[13.5px] outline-none focus:border-ink"
            />
            <button
              type="submit"
              disabled={pending}
              className="rounded-control bg-ink px-3 py-2 font-semibold text-lime disabled:opacity-60"
            >
              {pending ? "Invio in corso…" : "Ricevi il link di accesso"}
            </button>
            {state.status === "error" && <p className="text-xs text-red">{state.message}</p>}
            <p className="text-xs text-muted">Accesso riservato agli utenti invitati. Non serve una password.</p>
          </form>
        )}
      </div>
    </div>
  );
}
