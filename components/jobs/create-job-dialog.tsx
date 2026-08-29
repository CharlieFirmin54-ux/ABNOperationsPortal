"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES, PRIORITIES, useOperations } from "@/lib/store";
import type { JobCategory, Priority } from "@/lib/types";

export function CreateJobDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { properties, createJob } = useOperations();
  const [propertyId, setPropertyId] = useState("");
  const [tenant, setTenant] = useState("");
  const [priority, setPriority] = useState<Priority>("P1");
  const [category, setCategory] = useState<JobCategory>("Heating");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const resolvedPropertyId = propertyId || properties[0]?.id || "";
  const selected = useMemo(
    () => properties.find((property) => property.id === resolvedPropertyId),
    [properties, resolvedPropertyId]
  );
  const tenantValue = tenant || selected?.tenant || "";

  function resetFromProperty(id: string) {
    const property = properties.find((item) => item.id === id);
    setPropertyId(id);
    setTenant(property?.tenant ?? "");
  }

  function handleSubmit() {
    if (!resolvedPropertyId) {
      setError("Choose a property.");
      return;
    }
    if (!description.trim()) {
      setError("Add a short description of the fault.");
      return;
    }
    const job = createJob({
      tenant: tenantValue,
      propertyId: resolvedPropertyId,
      priority,
      category,
      description,
    });
    onOpenChange(false);
    setDescription("");
    setError("");
    router.push(`/jobs/${job.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-white/10 bg-[#111] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Raise a maintenance job</DialogTitle>
          <DialogDescription>
            Create a new works order against a property on the ABN portfolio.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="property">Property</Label>
            <select
              id="property"
              value={resolvedPropertyId}
              onChange={(event) => resetFromProperty(event.target.value)}
              className="h-9 rounded-lg border border-white/10 bg-[#0c0c0c] px-3 text-sm text-white"
              disabled={properties.length === 0}
            >
              {properties.length === 0 ? (
                <option value="">No mailbox properties yet</option>
              ) : (
                properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.address} · {property.organisation}
                  </option>
                ))
              )}
            </select>
            {properties.length === 0 && (
              <p className="text-xs text-zinc-500">
                Properties are created from jobsheet addresses in the Yahoo
                inbox. Sync the mailbox before raising a works order.
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tenant">Tenant</Label>
            <Input
              id="tenant"
              value={tenantValue}
              onChange={(event) => setTenant(event.target.value)}
              className="h-9 border-white/10 bg-[#0c0c0c]"
            />
          </div>
          {selected && (
            <p className="text-xs text-zinc-500">
              Organisation: {selected.organisation}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                value={priority}
                onChange={(event) => setPriority(event.target.value as Priority)}
                className="h-9 rounded-lg border border-white/10 bg-[#0c0c0c] px-3 text-sm text-white"
              >
                {PRIORITIES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Trade</Label>
              <select
                id="category"
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as JobCategory)
                }
                className="h-9 rounded-lg border border-white/10 bg-[#0c0c0c] px-3 text-sm text-white"
              >
                {CATEGORIES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Fault description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What has failed, and what access is available?"
              className="min-h-24 border-white/10 bg-[#0c0c0c]"
            />
          </div>
          {error && <p className="text-sm text-[#e11d2e]">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-[#e11d2e] text-white hover:bg-[#c41626]"
            onClick={handleSubmit}
            disabled={properties.length === 0}
          >
            Create job
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
