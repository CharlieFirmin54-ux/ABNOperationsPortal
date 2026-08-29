"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { BrandLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safeInternalPath } from "@/lib/auth/paths";

type MeResponse = {
  operator: { id: string } | null;
  configured: boolean;
  secretConfigured: boolean;
  configError: string | null;
};

export function LoginScreen() {
  return (
    <Suspense fallback={<LoginShell />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginShell({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="w-48 sm:w-56">
            <BrandLogo />
          </div>
          <h1 className="mt-5 text-xl font-semibold tracking-tight text-white sm:text-2xl">
            ABN Property Maintenance
          </h1>
          <p className="mt-1 text-sm text-zinc-500">Operations portal</p>
        </div>
        {children ?? (
          <div className="h-64 animate-pulse rounded-xl border border-white/8 bg-[#0c0c0c]" />
        )}
      </div>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = safeInternalPath(searchParams.get("from"));
  const signedOut = searchParams.get("reason") === "signed-out";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState(
    signedOut ? "You have been signed out." : ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [secretConfigured, setSecretConfigured] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => response.json() as Promise<MeResponse>)
      .then((data) => {
        if (cancelled) return;
        if (data.operator) {
          router.replace(from);
          return;
        }
        setConfigured(Boolean(data.configured));
        setSecretConfigured(Boolean(data.secretConfigured));
        if (data.configError) setError(data.configError);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not reach the portal.");
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [from, router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setInfo("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error || "Could not sign in.");
        return;
      }
      router.replace(from);
      router.refresh();
    } catch {
      setError("Could not sign in. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const blocked = !configured || !secretConfigured;

  return (
    <LoginShell>
      <div className="rounded-xl border border-white/8 bg-[#0c0c0c] p-5 sm:p-6">
        {!ready ? (
          <div className="h-48 animate-pulse rounded-lg bg-white/5" />
        ) : (
          <>
            {info && !error && (
              <p className="mb-4 rounded-lg border border-white/10 bg-[#161616] px-3 py-2 text-sm text-zinc-300">
                {info}
              </p>
            )}
            {error && (
              <p
                role="alert"
                className="mb-4 rounded-lg border border-[#e11d2e]/40 bg-[#e11d2e]/10 px-3 py-2 text-sm text-[#fca5a5]"
              >
                {error}
              </p>
            )}
            {!secretConfigured && (
              <p className="mb-4 text-sm text-zinc-400">
                Set <code className="text-zinc-300">AUTH_SECRET</code> in the
                environment before anyone can sign in.
              </p>
            )}
            {secretConfigured && !configured && (
              <div className="mb-4 space-y-2 text-sm text-zinc-400">
                <p>No operator logins have been set up.</p>
                <p>
                  Add <code className="text-zinc-300">AUTH_SEED_PASSWORD</code>{" "}
                  for Charlie, or{" "}
                  <code className="text-zinc-300">AUTH_OPERATORS</code> for the
                  rest of the team.
                </p>
              </div>
            )}
            <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-zinc-300">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="charlie@abnmaintenance.co.uk"
                  className="h-10 rounded-xl border-white/10 bg-[#161616] text-white placeholder:text-zinc-600"
                  disabled={blocked || submitting}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-zinc-300">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-10 rounded-xl border-white/10 bg-[#161616] text-white"
                  disabled={blocked || submitting}
                  required
                />
              </div>
              <Button
                type="submit"
                className="h-10 w-full rounded-xl bg-[#e11d2e] text-white hover:bg-[#c41626]"
                disabled={blocked || submitting}
              >
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Sign in
              </Button>
            </form>
          </>
        )}
      </div>
      <p className="mt-4 text-center text-xs text-zinc-600">
        Signed-in operators can open jobs, emails, and settings.
      </p>
    </LoginShell>
  );
}
