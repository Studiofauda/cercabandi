"use client";

import { useFormStatus } from "react-dom";

/**
 * Bottone di invio che mostra chiaramente quando il comando è partito: si disattiva,
 * mostra un indicatore e il messaggio di attesa finché il server non risponde.
 */
export function SubmitButton({
  children,
  pendingLabel,
  pendingHint,
  name,
  value,
  variant = "primary",
}: {
  children: React.ReactNode;
  pendingLabel: string;
  pendingHint?: string;
  name?: string;
  value?: string;
  variant?: "primary" | "secondary";
}) {
  const { pending, data } = useFormStatus();
  // Con più bottoni nello stesso modulo, solo quello premuto mostra l'attesa.
  const mine = pending && (!name || data?.get(name) === value);
  const base =
    variant === "primary"
      ? "bg-ink text-lime"
      : "border border-line bg-paper text-ink hover:border-ink";

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="submit"
        name={name}
        value={value}
        disabled={pending}
        aria-busy={mine}
        className={`inline-flex items-center gap-2 rounded-control px-4 py-2 text-[13px] font-semibold disabled:cursor-wait ${base} ${pending && !mine ? "opacity-50" : ""}`}
      >
        {mine && <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
        {mine ? pendingLabel : children}
      </button>
      {mine && pendingHint && <span className="text-[11px] text-muted" role="status">{pendingHint}</span>}
    </span>
  );
}
