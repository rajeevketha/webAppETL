"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ArrowLeftRight,
  Database,
  LayoutDashboard,
  Plug,
  Upload,
} from "lucide-react";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/pipelines", label: "Pipelines", icon: ArrowLeftRight },
  { href: "/import", label: "File import", icon: Upload },
  { href: "/connectors", label: "Connectors", icon: Plug },
  { href: "/jobs", label: "Job runs", icon: Activity },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[240px_1fr]">
      <aside className="bg-forest-deep text-[#e8f3ee] px-5 py-6 flex flex-col gap-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="h-9 w-9 rounded-md bg-forest grid place-items-center text-paper font-display text-lg">
            Fl
          </span>
          <span>
            <div className="font-display text-xl leading-none">Flowline</div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-[#9cb8ad] mt-1">
              Salesforce ETL
            </div>
          </span>
        </Link>
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
                  active ? "bg-forest text-white" : "text-[#c5d8cf] hover:bg-[#0c4a3c]"
                }`}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto rounded-lg border border-[#1f5d4d] p-3 text-xs leading-5 text-[#b7d0c6]">
          <div className="flex items-center gap-2 font-medium text-[#e8f3ee]">
            <Database size={14} />
            Demo org ready
          </div>
          Oracle CRM tables and Salesforce objects are seeded so you can map and load without credentials.
        </div>
      </aside>
      <div className="min-h-screen">
        <header className="h-14 border-b border-line flex items-center justify-between px-6 md:px-8 bg-card/70 backdrop-blur">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-soft">
            Extract · Transform · Load
          </div>
          <div className="text-sm text-ink-soft hidden sm:block">Oracle, SQL, CSV/Excel → Salesforce</div>
        </header>
        <main className="px-6 md:px-8 py-7">{children}</main>
      </div>
    </div>
  );
}
