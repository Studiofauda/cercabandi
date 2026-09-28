"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/opportunita", label: "Opportunità" },
  { href: "/profili", label: "Profili" },
  { href: "/simulazione", label: "Simulazione" },
  { href: "/fonti", label: "Fonti" },
];

export function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex shrink-0 flex-wrap items-center gap-4 bg-ink px-4 py-3 text-paper md:w-[200px] md:flex-col md:flex-nowrap md:items-stretch md:gap-6 md:py-5">
      <div className="leading-tight">
        <div className="text-lg font-black tracking-tight">cercabandi</div>
        <div className="text-[11px] text-muted">studiofauda</div>
      </div>
      <nav className="flex gap-1 md:flex-col">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-nav px-3 py-2 text-[13px] font-semibold transition-colors ${
                active ? "bg-lime text-ink" : "text-paper/80 hover:bg-ink-soft hover:text-paper"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <form action="/auth/esci" method="post" className="ml-auto md:mt-auto md:ml-0">
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
