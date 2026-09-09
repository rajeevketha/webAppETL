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
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[232px_1fr] bg-paper">
      <aside className="bg-card border-b md:border-b-0 md:border-r border-line px-4 py-5 flex flex-col gap-7">
        <Link href="/" className="flex items-center gap-2.5 px-2">
          <span className="h-8 w-8 rounded-lg bg-ink text-white grid place-items-center text-[13px] font-medium tracking-tight">
            Fl
          </span>
          <span>
            <div className="text-[15px] font-medium tracking-tight leading-none">Flowline</div>
            <div className="text-[11px] text-ink-soft mt-1 tracking-wide">Salesforce ETL</div>
          </span>
        </Link>
        <nav className="flex flex-col gap-0.5">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] transition-colors ${
                  active
                    ? "bg-paper-2 text-ink font-medium"
                    : "text-ink-soft hover:bg-paper hover:text-ink"
                }`}
              >
                <Icon size={16} strokeWidth={1.75} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto rounded-xl bg-paper px-3 py-3 text-xs leading-5 text-ink-soft">
          <div className="flex items-center gap-2 font-medium text-ink">
            <Database size={14} strokeWidth={1.75} />
            Demo org ready
          </div>
          <p className="mt-1.5">Oracle CRM and Salesforce metadata are seeded. Map and load without credentials.</p>
        </div>
      </aside>
      <div className="min-h-screen">
        <header className="h-13 min-h-12 border-b border-line flex items-center justify-between px-6 md:px-8 bg-card">
          <div className="text-[12px] text-ink-soft tracking-wide">Extract · Transform · Load</div>
          <div className="text-[12px] text-ink-soft hidden sm:block">Oracle, SQL, CSV / Excel → Salesforce</div>
        </header>
        <main className="px-6 md:px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
