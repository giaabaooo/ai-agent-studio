"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Package,
  Film,
  Sparkles,
  Flame,
  FolderHeart,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import { useSidebar } from "./sidebar-context";

const navItems = [
  { href: "/tiktok-dance", label: "TikTok Dance Studio", icon: Flame, highlight: true },
  { href: "/animation", label: "Kịch Bản & Series Phim", icon: Film },
  { href: "/products", label: "TikTok Affiliate (Mix Model & SP)", icon: Sparkles },
  { href: "/gallery", label: "Kho Media & Cloud Vault", icon: FolderHeart },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isOpen, close } = useSidebar();

  const renderNav = (isMobile = false) => (
    <>
      {/* Brand Header */}
      <div className="p-5 border-b border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-indigo-500 flex items-center justify-center text-white shadow-md shadow-primary/20 shrink-0">
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

        {isMobile && (
          <button
            onClick={close}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title="Đóng menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
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
              prefetch={false}
              onClick={() => {
                if (isMobile) close();
              }}
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
            v1.2-Phase3
          </span>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar: Always visible on desktop (lg+), full width 64 */}
      <aside className="hidden lg:flex w-64 border-r border-border bg-card/60 backdrop-blur-md flex-col h-screen sticky top-0 shrink-0">
        {renderNav(false)}
      </aside>

      {/* Mobile Drawer: Only rendered on screens < lg when open */}
      {isOpen && (
        <div className="lg:hidden">
          {/* Backdrop overlay */}
          <div
            onClick={close}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
            aria-hidden="true"
          />

          {/* Drawer content */}
          <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border shadow-2xl flex flex-col h-screen animate-in slide-in-from-left duration-200">
            {renderNav(true)}
          </aside>
        </div>
      )}
    </>
  );
}
