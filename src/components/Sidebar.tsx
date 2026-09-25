"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/opportunita", label: "Opportunità" },
  { href: "/profili", label: "Profili" },
  { href: "/fonti", label: "Fonti" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex shrink-0 items-center gap-4 bg-ink px-4 py-3 text-paper md:w-[200px] md:flex-col md:items-stretch md:gap-6 md:py-5">
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
    </aside>
  );
}
