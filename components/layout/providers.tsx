"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/components/layout/auth-provider";
import { AppShell } from "@/components/layout/app-shell";
import { OperationsProvider } from "@/lib/store";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <AuthProvider>
        <OperationsProvider>
          <AppShell>{children}</AppShell>
        </OperationsProvider>
      </AuthProvider>
    </TooltipProvider>
  );
}
