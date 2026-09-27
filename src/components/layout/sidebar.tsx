"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { UserMenu } from "./user-menu";
import {
  LayoutDashboard,
  Search,
  Users,
  FileSearch,
  FileText,
  Clock,
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/search", label: "Search Leads", icon: Search },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/audits", label: "Audits", icon: FileSearch },
  { href: "/proposals", label: "Proposals", icon: FileText },
  { href: "/followups", label: "Follow-ups", icon: Clock },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 flex-col border-r border-ink-600/10 bg-white">
      <div className="flex h-16 items-center px-5">
        <span className="text-sm font-semibold tracking-tight text-ink-900">
          Local Lead Intelligence
        </span>
      </div>
      <nav className="flex-1 space-y-0.5 px-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-ink-950 text-paper"
                  : "text-ink-800 hover:bg-ink-950/[.05]",
              )}
            >
              <Icon size={16} strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-ink-600/10 p-4">
        <UserMenu />
        <p className="mt-2 text-xs text-ink-600">Phase 4 · mock data</p>
      </div>
    </aside>
  );
}
