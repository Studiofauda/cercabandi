"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/*
 * Menu in tre gruppi, per frequenza d'uso:
 * - il lavoro di tutti i giorni (voci grandi, in alto);
 * - gli strumenti di analisi, da usare su un bando o un profilo specifico;
 * - le impostazioni, che si toccano di rado.
 */
const GROUPS: { title?: string; primary?: boolean; items: { href: string; label: string; hint?: string }[] }[] = [
  {
    primary: true,
    items: [
      { href: "/novita", label: "Novità", hint: "cosa è cambiato" },
      { href: "/opportunita", label: "Opportunità", hint: "tutti i bandi" },
      { href: "/riepilogo", label: "Riepilogo", hint: "da mandare ai colleghi" },
    ],
  },
  {
    title: "Analisi",
    items: [
      { href: "/simulazione", label: "Simulazione" },
      { href: "/cumulabilita", label: "Cumulabilità" },
    ],
  },
  {
    title: "Impostazioni",
    items: [
      { href: "/profili", label: "Profili" },
      { href: "/fonti", label: "Fonti" },
      { href: "/utenti", label: "Utenti" },
    ],
  },
];

export function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();
  // «Nuovo bando» e «Modifica bando» fanno parte di Opportunità.
  const isActive = (href: string) => pathname.startsWith(href) || (href === "/opportunita" && pathname.startsWith("/bandi"));

  return (
    <aside className="flex shrink-0 flex-wrap items-center gap-4 bg-ink px-4 py-3 text-paper md:sticky md:top-0 md:h-screen md:w-[200px] md:flex-col md:flex-nowrap md:items-stretch md:gap-6 md:py-5">
      <div className="shrink-0 leading-tight">
        <div className="text-lg font-black tracking-tight">cercabandi</div>
        <div className="text-[11px] text-muted">studiofauda</div>
      </div>
      {/* Su schermi bassi scorre solo il menu: l'utente in fondo resta sempre visibile. */}
      <nav className="flex flex-wrap gap-x-3 gap-y-1 md:min-h-0 md:flex-1 md:flex-col md:flex-nowrap md:gap-5 md:overflow-y-auto">
        {GROUPS.map((group, i) => (
          <div key={i} className="flex shrink-0 flex-wrap gap-1 md:flex-col">
            {group.title && (
              <div className="hidden px-3 pb-0.5 text-[10.5px] font-semibold tracking-[0.08em] text-muted uppercase md:block">{group.title}</div>
            )}
            {group.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-nav px-3 transition-colors ${group.primary ? "py-2 text-[14px] font-bold" : "py-1.5 text-[12.5px] font-semibold"} ${
                    active ? "bg-lime text-ink" : group.primary ? "text-paper hover:bg-ink-soft" : "text-paper/70 hover:bg-ink-soft hover:text-paper"
                  }`}
                >
                  {item.label}
                  {group.primary && item.hint && (
                    <span className={`hidden text-[11px] font-normal md:block ${active ? "text-ink/70" : "text-muted"}`}>{item.hint}</span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <form action="/auth/esci" method="post" className="ml-auto shrink-0 md:ml-0 md:border-t md:border-ink-soft md:pt-3">
        <div className="hidden truncate text-[11px] text-muted md:block" title={email}>
          {email}
        </div>
        <button type="submit" className="mt-1 text-[12px] font-semibold text-paper/80 hover:text-lime">
          Esci
        </button>
      </form>
    </aside>
  );
}
