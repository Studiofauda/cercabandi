"use client";

import { useState } from "react";

/** Copia del testo e apertura del programma di posta con destinatari e testo già pronti. */
export function CopyDigest({ text, subject, to }: { text: string; subject: string; to: string[] }) {
  const [copied, setCopied] = useState(false);
  // I programmi di posta accettano indirizzi mailto di lunghezza limitata: oltre, si copia.
  const mailBody = text.length > 1800 ? `${text.slice(0, 1700)}\n\n[… testo completo copiato negli appunti: incollalo qui]` : text;
  const href = `mailto:${to.join(",")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(mailBody)}`;

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => navigator.clipboard.writeText(text).then(() => setCopied(true))}
        className="rounded-control bg-ink px-3 py-1.5 text-xs font-semibold text-lime"
      >
        {copied ? "✓ Testo copiato" : "Copia il testo"}
      </button>
      <a
        href={href}
        onClick={() => {
          if (text.length > 1800) navigator.clipboard.writeText(text).then(() => setCopied(true));
        }}
        className="rounded-control border border-ink px-3 py-1.5 text-xs font-semibold"
      >
        Scrivi l&apos;email ai colleghi
      </a>
    </div>
  );
}
