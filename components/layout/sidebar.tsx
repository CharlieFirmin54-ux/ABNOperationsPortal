"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  LayoutDashboard,
  Mail,
  Settings,
  Wrench,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs", icon: Wrench },
  { href: "/properties", label: "Properties", icon: Building2 },
  { href: "/emails", label: "Emails", icon: Mail },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex h-full w-60 shrink-0 flex-col border-r border-white/8 bg-black",
        className
      )}
    >
      <div className="flex flex-col items-center px-4 pt-6 pb-6">
        <BrandLogo />
        <p className="mt-3 text-xs text-zinc-500">Operations Portal</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-[#e11d2e] font-medium text-white"
                  : "text-zinc-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 pb-6 pt-4">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span className="size-2 rounded-full bg-emerald-500" />
          System Online
        </div>
        <p className="mt-3 text-[11px] leading-4 text-zinc-600">
          ABN Property Maintenance
          <br />
          Version 1.0.0
        </p>
      </div>
    </aside>
  );
}
