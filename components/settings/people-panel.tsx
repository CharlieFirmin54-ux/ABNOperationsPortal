"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { useAuth } from "@/components/layout/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ListedOperator, OperatorRole } from "@/lib/auth/types";
import { OPERATOR_ROLES } from "@/lib/auth/types";

export function PeoplePanel() {
  const { operator } = useAuth();
  const [people, setPeople] = useState<ListedOperator[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OperatorRole>("Operator");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/auth/operators", { cache: "no-store" });
      const data = (await response.json()) as {
        operators?: ListedOperator[];
        canManage?: boolean;
        error?: string;
      };
      if (!response.ok) {
        setError(data.error || "Could not load people.");
        return;
      }
      setPeople(data.operators ?? []);
      setCanManage(Boolean(data.canManage));
    } catch {
      setError("Could not load people.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void load();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [load]);

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    setError("");
    setFlash("");
    setSaving(true);
    try {
      const response = await fetch("/api/auth/operators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role, password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error || "Could not add that login.");
        return;
      }
      setName("");
      setEmail("");
      setRole("Operator");
      setPassword("");
      setFlash("Login added. They can sign in now.");
      await load();
    } catch {
      setError("Could not add that login.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(person: ListedOperator) {
    if (
      !window.confirm(
        `Remove the login for ${person.name} (${person.email})?`
      )
    ) {
      return;
    }
    setError("");
    setFlash("");
    try {
      const response = await fetch(
        `/api/auth/operators/${encodeURIComponent(person.id)}`,
        { method: "DELETE" }
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error || "Could not remove that login.");
        return;
      }
      setFlash(`Removed ${person.name}.`);
      await load();
    } catch {
      setError("Could not remove that login.");
    }
  }

  return (
    <section className="rounded-xl border border-white/8 bg-[#0c0c0c] p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-medium text-white">People / Logins</h3>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            Operators sign in with email and password. Extra people added here
            are stored locally in a gitignored file — not in git. On Vercel, set
            them with environment variables instead.
          </p>
        </div>
      </div>

      {flash && (
        <p className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          {flash}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-[#e11d2e]/40 bg-[#e11d2e]/10 px-3 py-2 text-sm text-[#fca5a5]"
        >
          {error}
        </p>
      )}

      <div className="mt-4 overflow-x-auto">
        {loading ? (
          <div className="h-20 animate-pulse rounded-lg bg-white/5" />
        ) : people.length === 0 ? (
          <p className="rounded-lg border border-dashed border-white/10 px-4 py-6 text-sm text-zinc-500">
            No operator logins yet.
          </p>
        ) : (
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead>
              <tr className="border-b border-white/8 text-xs tracking-wide text-zinc-500 uppercase">
                <th className="py-2 pr-3 font-medium">Name</th>
                <th className="py-2 pr-3 font-medium">Email</th>
                <th className="py-2 pr-3 font-medium">Role</th>
                <th className="py-2 pr-3 font-medium">Source</th>
                <th className="py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {people.map((person) => (
                <tr key={person.id} className="border-b border-white/5">
                  <td className="py-3 pr-3 text-white">
                    {person.name}
                    {person.id === operator?.id ? (
                      <span className="ml-2 text-xs text-zinc-500">you</span>
                    ) : null}
                  </td>
                  <td className="py-3 pr-3 text-zinc-300">{person.email}</td>
                  <td className="py-3 pr-3 text-zinc-300">{person.role}</td>
                  <td className="py-3 pr-3 text-zinc-500">
                    {person.source === "env" ? "Environment" : "Saved locally"}
                  </td>
                  <td className="py-3 text-right">
                    {canManage && person.source === "file" ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-zinc-400 hover:text-white"
                        onClick={() => void handleRemove(person)}
                      >
                        <Trash2 className="size-3.5" />
                        Remove
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {canManage ? (
        <form
          className="mt-6 grid gap-3 border-t border-white/8 pt-5 sm:grid-cols-2"
          onSubmit={(event) => void handleAdd(event)}
        >
          <p className="sm:col-span-2 flex items-center gap-2 text-sm font-medium text-white">
            <UserPlus className="size-4" />
            Add a login
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="person-name" className="text-zinc-400">
              Name
            </Label>
            <Input
              id="person-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-10 rounded-xl border-white/10 bg-[#161616] text-white"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="person-email" className="text-zinc-400">
              Email
            </Label>
            <Input
              id="person-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-10 rounded-xl border-white/10 bg-[#161616] text-white"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="person-role" className="text-zinc-400">
              Role
            </Label>
            <select
              id="person-role"
              value={role}
              onChange={(event) => setRole(event.target.value as OperatorRole)}
              className="h-10 w-full rounded-xl border border-white/10 bg-[#161616] px-3 text-sm text-white"
            >
              {OPERATOR_ROLES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="person-password" className="text-zinc-400">
              Password
            </Label>
            <Input
              id="person-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-10 rounded-xl border-white/10 bg-[#161616] text-white"
              minLength={8}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <Button
              type="submit"
              className="h-10 rounded-xl bg-[#e11d2e] text-white hover:bg-[#c41626]"
              disabled={saving}
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Add person
            </Button>
          </div>
        </form>
      ) : (
        <p className="mt-5 text-sm text-zinc-500">
          Only administrators can add or remove logins.
        </p>
      )}
    </section>
  );
}
