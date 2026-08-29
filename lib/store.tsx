"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ELECTRICAL_CERTS_CATEGORY, isElectricalCertText } from "@/lib/electrical-certs";
import {
  nextJobNumber,
  normalizeCategory,
  normalizePriority,
  normalizeStatus,
} from "@/lib/format";
import {
  HOUSE_RENOVATIONS_CATEGORY,
  isHouseRenovationText,
} from "@/lib/house-renovations";
import type {
  InboxEmail,
  InboxSource,
  Job,
  JobCategory,
  JobNote,
  JobStatus,
  JobsFetchResult,
  NotificationItem,
  Priority,
  Property,
} from "@/lib/types";

const STORAGE_KEY = "abn-ops-store-v2";

type JobPatch = Partial<Pick<Job, "status" | "priority" | "category">>;

type StoreState = {
  jobs: Job[];
  properties: Property[];
  emails: InboxEmail[];
  notes: JobNote[];
  notifications: NotificationItem[];
  jobPatches: Record<string, JobPatch>;
};

type MailboxMeta = {
  source: InboxSource;
  configured: boolean;
  error: string | null;
};

type CreateJobInput = {
  tenant: string;
  tenantPhone?: string;
  tenantEmail?: string;
  propertyId: string;
  priority: Priority;
  status?: JobStatus;
  category: JobCategory;
  description: string;
};

type OperationsStore = StoreState &
  MailboxMeta & {
    hydrated: boolean;
    syncing: boolean;
    refreshMailbox: (fresh?: boolean) => Promise<void>;
    createJob: (input: CreateJobInput) => Job;
    createTestJob: () => Job;
    updateJob: (id: string, patch: JobPatch) => void;
    addNote: (jobId: string, body: string) => void;
    markEmailRead: (id: string) => void;
    markNotificationsRead: () => void;
    resetDemo: () => void;
  };

const emptyState = (): StoreState => ({
  jobs: [],
  properties: [],
  emails: [],
  notes: [],
  notifications: [],
  jobPatches: {},
});

function propertiesFromJobs(jobs: Job[], extras: Property[] = []): Property[] {
  const map = new Map<string, Property>();
  for (const property of extras) {
    map.set(property.id, property);
  }
  for (const job of jobs) {
    if (!job.propertyId || job.address === "Address not stated") continue;
    const current = map.get(job.propertyId);
    if (current) {
      map.set(job.propertyId, {
        ...current,
        tenant: current.tenant || job.tenant,
        organisation: current.organisation || job.organisation,
      });
      continue;
    }
    const postcodeMatch = job.address.match(
      /\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/i
    );
    map.set(job.propertyId, {
      id: job.propertyId,
      name: job.address.split(",")[0]?.trim() || job.address,
      address: job.address,
      postcode: postcodeMatch ? postcodeMatch[1].toUpperCase() : "",
      organisation: job.organisation,
      tenant: job.tenant === "Not recorded" ? "" : job.tenant,
      type: "House",
      bedrooms: 0,
    });
  }
  return [...map.values()].sort((a, b) => a.address.localeCompare(b.address));
}

function classifyJob<T extends { priority?: string; status?: string; category?: string }>(
  job: T
): T & { priority: Priority; status: JobStatus; category: JobCategory } {
  return {
    ...job,
    priority: normalizePriority(job.priority),
    status: normalizeStatus(job.status),
    category: normalizeCategory(job.category),
  };
}

function classifyPatch(patch: JobPatch): JobPatch {
  const next: JobPatch = { ...patch };
  if (patch.priority) next.priority = normalizePriority(patch.priority);
  if (patch.status) next.status = normalizeStatus(patch.status);
  if (patch.category) next.category = normalizeCategory(patch.category);
  return next;
}

function resolveCreatedCategory(
  fallback: JobCategory,
  description: string
): JobCategory {
  if (isHouseRenovationText(description)) return HOUSE_RENOVATIONS_CATEGORY;
  if (isElectricalCertText(description)) return ELECTRICAL_CERTS_CATEGORY;
  return normalizeCategory(fallback);
}

function applyPatches(jobs: Job[], patches: Record<string, JobPatch>): Job[] {
  return jobs.map((job) => {
    const patch = patches[job.id];
    return classifyJob(patch ? { ...job, ...patch } : job);
  });
}

function mergeMailbox(
  current: StoreState,
  incoming: JobsFetchResult
): StoreState {
  if (incoming.source !== "yahoo") {
    return current;
  }

  const incomingJobs = applyPatches(
    incoming.jobs.map((job) => ({ ...job, origin: "mailbox" as const })),
    current.jobPatches
  );
  const incomingIds = new Set(incomingJobs.map((job) => job.id));
  const previousMailbox = current.jobs.filter(
    (job) => job.origin !== "local" && !incomingIds.has(job.id)
  );
  const localJobs = current.jobs.filter((job) => job.origin === "local");
  const jobs = applyPatches(
    [...incomingJobs, ...previousMailbox, ...localJobs],
    current.jobPatches
  ).sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const emailMap = new Map<string, InboxEmail>();
  for (const email of current.emails) emailMap.set(email.id, email);
  for (const email of incoming.emails) emailMap.set(email.id, email);

  const readState = new Map(
    current.notifications.map((item) => [item.id, item.read])
  );
  const notifications = (incoming.notifications ?? []).map((item) => ({
    ...item,
    read: readState.get(item.id) ?? item.read,
  }));

  return {
    ...current,
    jobs,
    properties: propertiesFromJobs(jobs, incoming.properties),
    emails: [...emailMap.values()].sort(
      (a, b) =>
        new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
    ),
    notifications:
      notifications.length > 0 ? notifications : current.notifications,
  };
}

const OperationsContext = createContext<OperationsStore | null>(null);

export function OperationsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StoreState>(emptyState);
  const [hydrated, setHydrated] = useState(false);
  const [syncing, setSyncing] = useState(true);
  const [mailbox, setMailbox] = useState<MailboxMeta>({
    source: "unconfigured",
    configured: false,
    error: null,
  });

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<StoreState>;
          const patches = Object.fromEntries(
            Object.entries(parsed.jobPatches ?? {}).map(([id, patch]) => [
              id,
              classifyPatch(patch),
            ])
          );
          setState({
            jobs: applyPatches(parsed.jobs ?? [], patches),
            properties: parsed.properties ?? [],
            emails: parsed.emails ?? [],
            notes: parsed.notes ?? [],
            notifications: parsed.notifications ?? [],
            jobPatches: patches,
          });
        }
      } catch {
        setState(emptyState());
      } finally {
        setHydrated(true);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

  const refreshMailbox = useCallback(async (fresh = false) => {
    setSyncing(true);
    try {
      const response = await fetch(
        fresh ? "/api/jobs?fresh=1" : "/api/jobs",
        { cache: "no-store" }
      );
      const data = (await response.json()) as JobsFetchResult;
      setMailbox({
        source: data.source,
        configured: data.configured,
        error: data.error,
      });
      setState((current) => mergeMailbox(current, data));
    } catch {
      setMailbox({
        source: "error",
        configured: true,
        error: "Could not reach the jobs API.",
      });
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const frame = window.requestAnimationFrame(() => {
      void refreshMailbox(false);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [hydrated, refreshMailbox]);

  const persistJob = useCallback((input: CreateJobInput, asTest = false) => {
    const property =
      state.properties.find((item) => item.id === input.propertyId) ??
      state.properties[0];
    const now = new Date().toISOString();
    const jobNo = nextJobNumber(state.jobs);
    const address = property?.address || "Unassigned";
    const organisation = property?.organisation || "ABN Property Maintenance";
    const propertyId = property?.id || "prop-unassigned";
    const created: Job = {
      id: jobNo,
      jobNo,
      tenant: input.tenant.trim() || property?.tenant || "Test tenant",
      tenantPhone: input.tenantPhone?.trim() || "",
      tenantEmail: input.tenantEmail?.trim() || "",
      address,
      organisation,
      priority: normalizePriority(input.priority),
      status: normalizeStatus(input.status ?? "Open"),
      category: resolveCreatedCategory(input.category, input.description),
      description: input.description.trim(),
      propertyId,
      createdAt: now,
      updatedAt: now,
      origin: "local",
    };
    const notification: NotificationItem = {
      id: `ntf-${jobNo}`,
      title: asTest ? "Test job created" : "New job raised",
      body: `Job ${jobNo} opened for ${address}.`,
      createdAt: now,
      read: false,
      href: `/jobs/${jobNo}`,
    };
    setState((current) => ({
      ...current,
      jobs: [created, ...current.jobs],
      properties: propertiesFromJobs([created, ...current.jobs], current.properties),
      notifications: [notification, ...current.notifications],
    }));
    return created;
  }, [state.jobs, state.properties]);

  const createJob = useCallback(
    (input: CreateJobInput) => persistJob(input),
    [persistJob]
  );

  const createTestJob = useCallback(() => {
    const property = state.properties[0];
    return persistJob(
      {
        tenant: property?.tenant || "Test tenant",
        propertyId: property?.id || "prop-unassigned",
        priority: "P1",
        status: "Open",
        category: "Normal",
        description:
          "Test job created from the operations dashboard. Confirm the fault and access on arrival.",
      },
      true
    );
  }, [persistJob, state.properties]);

  const updateJob = useCallback((id: string, patch: JobPatch) => {
    setState((current) => ({
      ...current,
      jobPatches: {
        ...current.jobPatches,
        [id]: classifyPatch({ ...current.jobPatches[id], ...patch }),
      },
      jobs: current.jobs.map((job) =>
        job.id === id
          ? classifyJob({ ...job, ...patch, updatedAt: new Date().toISOString() })
          : job
      ),
    }));
  }, []);

  const addNote = useCallback((jobId: string, body: string) => {
    const trimmed = body.trim();
    if (!trimmed) return;
    setState((current) => ({
      ...current,
      notes: [
        {
          id: `note-${Date.now()}`,
          jobId,
          author: "Charlie",
          body: trimmed,
          createdAt: new Date().toISOString(),
        },
        ...current.notes,
      ],
    }));
  }, []);

  const markEmailRead = useCallback((id: string) => {
    setState((current) => ({
      ...current,
      emails: current.emails.map((email) =>
        email.id === id ? { ...email, read: true } : email
      ),
    }));
  }, []);

  const markNotificationsRead = useCallback(() => {
    setState((current) => ({
      ...current,
      notifications: current.notifications.map((item) => ({
        ...item,
        read: true,
      })),
    }));
  }, []);

  const resetDemo = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setState(emptyState());
    void refreshMailbox(true);
  }, [refreshMailbox]);

  const value = useMemo<OperationsStore>(
    () => ({
      ...state,
      ...mailbox,
      hydrated,
      syncing,
      refreshMailbox,
      createJob,
      createTestJob,
      updateJob,
      addNote,
      markEmailRead,
      markNotificationsRead,
      resetDemo,
    }),
    [
      addNote,
      createJob,
      createTestJob,
      hydrated,
      mailbox,
      markEmailRead,
      markNotificationsRead,
      refreshMailbox,
      resetDemo,
      state,
      syncing,
      updateJob,
    ]
  );

  return (
    <OperationsContext.Provider value={value}>
      {children}
    </OperationsContext.Provider>
  );
}

export function useOperations() {
  const context = useContext(OperationsContext);
  if (!context) {
    throw new Error("useOperations must be used within OperationsProvider");
  }
  return context;
}

export function jobMatchesQuery(job: Job, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [
    job.jobNo,
    job.tenant,
    job.address,
    job.organisation,
    job.status,
    job.priority,
    job.category,
  ]
    .join(" ")
    .toLowerCase()
    .includes(q);
}

export function propertyMatchesQuery(property: Property, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [property.name, property.address, property.organisation, property.tenant, property.postcode]
    .join(" ")
    .toLowerCase()
    .includes(q);
}

export const STATUSES: JobStatus[] = ["Open", "TT Contacted", "Completed"];

export const PRIORITIES: Priority[] = ["P1", "Normal"];
export const CATEGORIES: JobCategory[] = [
  "Normal",
  ELECTRICAL_CERTS_CATEGORY,
  HOUSE_RENOVATIONS_CATEGORY,
];
