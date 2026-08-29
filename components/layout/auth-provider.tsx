"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type { PublicOperator } from "@/lib/auth/types";

type AuthStatus = {
  operator: PublicOperator | null;
  configured: boolean;
  secretConfigured: boolean;
  configError: string | null;
};

type AuthContextValue = AuthStatus & {
  loading: boolean;
  refresh: () => Promise<AuthStatus>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const emptyStatus = (): AuthStatus => ({
  operator: null,
  configured: false,
  secretConfigured: false,
  configError: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(emptyStatus);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      const data = (await response.json()) as Partial<AuthStatus>;
      const next: AuthStatus = {
        operator: data.operator ?? null,
        configured: Boolean(data.configured),
        secretConfigured: Boolean(data.secretConfigured),
        configError: data.configError ?? null,
      };
      setStatus(next);
      return next;
    } catch {
      const next = emptyStatus();
      setStatus(next);
      return next;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void refresh();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [refresh, pathname]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setStatus((current) => ({ ...current, operator: null }));
    router.replace("/login?reason=signed-out");
    router.refresh();
  }, [router]);

  const value = useMemo(
    () => ({ ...status, loading, refresh, logout }),
    [status, loading, refresh, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return value;
}
