"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/layout/app-shell";
import { OperationsProvider } from "@/lib/store";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <OperationsProvider>
        <AppShell>{children}</AppShell>
      </OperationsProvider>
    </TooltipProvider>
  );
}
