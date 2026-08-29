"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-black text-white">
      <div className="hidden lg:block">
        <Sidebar className="sticky top-0 h-screen" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
        <footer className="flex flex-col gap-1 border-t border-white/8 px-4 py-4 text-xs text-zinc-600 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p>ABN Property Maintenance Operations Portal</p>
          <p>Powered by Next.js • Supabase • TypeScript</p>
        </footer>
      </div>
    </div>
  );
}
