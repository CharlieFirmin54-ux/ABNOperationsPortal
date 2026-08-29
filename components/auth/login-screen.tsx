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
  canSetup?: boolean;
  suggestedEmail?: string;
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

  const [email, setEmail] = useState("charlie@abnmaintenance.co.uk");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("Charlie");
  const [error, setError] = useState("");
  const [info, setInfo] = useState(
    signedOut ? "You have been signed out." : ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [canSetup, setCanSetup] = useState(false);
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
        const setup = Boolean(data.canSetup) || !data.configured;
        setCanSetup(setup);
        if (data.suggestedEmail) {
          setEmail(data.suggestedEmail);
        }
        if (data.configError) setError(data.configError);
        else if (setup) {
          setInfo(
            "Nobody has a login on this server yet. Create the first administrator here, then you can open the portal."
          );
        }
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
      if (canSetup) {
        if (password !== confirmPassword) {
          setError("Those passwords do not match.");
          return;
        }
        const response = await fetch("/api/auth/setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: fullName,
            email,
            password,
            confirmPassword,
          }),
        });
        const data = (await response.json()) as { error?: string };
        if (!response.ok) {
          setError(data.error || "Could not create the first administrator.");
          return;
        }
      } else {
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
      }
      router.replace(from);
      router.refresh();
    } catch {
      setError(
        canSetup
          ? "Could not create the first administrator. Try again."
          : "Could not sign in. Try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

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
            <form
              className="space-y-4"
              onSubmit={(event) => void handleSubmit(event)}
            >
              {canSetup ? (
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-zinc-300">
                    Full name
                  </Label>
                  <Input
                    id="name"
                    autoComplete="name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="h-10 rounded-xl border-white/10 bg-[#161616] text-white"
                    disabled={submitting}
                    required
                  />
                </div>
              ) : null}
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
                  disabled={submitting}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-zinc-300">
                  {canSetup ? "Choose a password" : "Password"}
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={canSetup ? "new-password" : "current-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-10 rounded-xl border-white/10 bg-[#161616] text-white"
                  disabled={submitting}
                  required
                  minLength={canSetup ? 8 : undefined}
                />
              </div>
              {canSetup ? (
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password" className="text-zinc-300">
                    Confirm password
                  </Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="h-10 rounded-xl border-white/10 bg-[#161616] text-white"
                    disabled={submitting}
                    required
                    minLength={8}
                  />
                </div>
              ) : null}
              <Button
                type="submit"
                className="h-10 w-full rounded-xl bg-[#e11d2e] text-white hover:bg-[#c41626]"
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                {canSetup ? "Create administrator and enter" : "Sign in"}
              </Button>
            </form>
          </>
        )}
      </div>
      <p className="mt-4 text-center text-xs text-zinc-600">
        {canSetup
          ? "This creates the first administrator for this server. Use the same email and password next time you sign in."
          : "Signed-in operators can open jobs, emails, and settings."}
      </p>
    </LoginShell>
  );
}
