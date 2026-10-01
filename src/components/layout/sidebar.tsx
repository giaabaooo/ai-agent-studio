"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Package,
  Clapperboard,
  Calendar,
  BarChart3,
  Brain,
  FlaskConical,
  BookOpen,
  Milestone,
  DollarSign,
  Settings,
  Sparkles,
} from "lucide-react";
import { clsx } from "clsx";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/creators", label: "Creators (Linh & Nam)", icon: Users },
  { href: "/products", label: "Products", icon: Package },
  { href: "/content", label: "Content Lab", icon: Clapperboard, highlight: true },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/analyst", label: "Daily Analyst", icon: Brain },
  { href: "/experiments", label: "Experiments", icon: FlaskConical },
  { href: "/knowledge", label: "Knowledge Base", icon: BookOpen },
  { href: "/roadmap", label: "Account Roadmap", icon: Milestone },
  { href: "/finance", label: "Finance / Affiliate", icon: DollarSign },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-border bg-card/60 backdrop-blur-md flex flex-col h-screen sticky top-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-border flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-indigo-500 flex items-center justify-center text-white shadow-md shadow-primary/20">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-sm tracking-tight text-foreground">
            Affiliate AI Studio
          </h1>
          <p className="text-[11px] text-muted-foreground font-medium">
            TikTok UGC &bull; Local-First
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/70",
                item.highlight && !isActive && "text-primary font-semibold"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
              {item.highlight && !isActive && (
                <span className="ml-auto text-[10px] uppercase tracking-wider bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded">
                  Core
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-border bg-secondary/30">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Local Mac (Port 5433)
          </span>
          <span className="font-mono text-[10px] bg-secondary px-1.5 py-0.5 rounded">
            v1.0-Free
          </span>
        </div>
      </div>
    </aside>
  );
}
