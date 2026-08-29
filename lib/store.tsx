"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { nextJobNumber } from "@/lib/format";
import {
  emails as seedEmails,
  jobs as seedJobs,
  notes as seedNotes,
  notifications as seedNotifications,
  properties as seedProperties,
} from "@/lib/seed-data";
import type {
  InboxEmail,
  Job,
  JobCategory,
  JobNote,
  JobStatus,
  NotificationItem,
  Priority,
  Property,
} from "@/lib/types";

const STORAGE_KEY = "abn-ops-store-v1";

type StoreState = {
  jobs: Job[];
  properties: Property[];
  emails: InboxEmail[];
  notes: JobNote[];
  notifications: NotificationItem[];
};

type CreateJobInput = {
  tenant: string;
  tenantPhone?: string;
  tenantEmail?: string;
  propertyId: string;
  priority: Priority;
  category: JobCategory;
  description: string;
};

type OperationsStore = StoreState & {
  hydrated: boolean;
  createJob: (input: CreateJobInput) => Job;
  createTestJob: () => Job;
  updateJob: (id: string, patch: Partial<Pick<Job, "status" | "priority">>) => void;
  addNote: (jobId: string, body: string) => void;
  markEmailRead: (id: string) => void;
  markNotificationsRead: () => void;
  resetDemo: () => void;
};

const seedState = (): StoreState => ({
  jobs: seedJobs,
  properties: seedProperties,
  emails: seedEmails,
  notes: seedNotes,
  notifications: seedNotifications,
});

const OperationsContext = createContext<OperationsStore | null>(null);

export function OperationsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StoreState>(seedState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<StoreState>;
          setState({
            jobs: parsed.jobs ?? seedJobs,
            properties: parsed.properties ?? seedProperties,
            emails: parsed.emails ?? seedEmails,
            notes: parsed.notes ?? seedNotes,
            notifications: parsed.notifications ?? seedNotifications,
          });
        }
      } catch {
        setState(seedState());
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

  const persistJob = useCallback((input: CreateJobInput, asTest = false) => {
    const property =
      state.properties.find((item) => item.id === input.propertyId) ??
      state.properties[0];
    if (!property) {
      throw new Error("No properties available to raise a job against.");
    }
    const jobNo = nextJobNumber(state.jobs);
    const now = new Date().toISOString();
    const created: Job = {
      id: jobNo,
      jobNo,
      tenant: input.tenant.trim() || property.tenant,
      tenantPhone: input.tenantPhone?.trim() || "07700 900000",
      tenantEmail: input.tenantEmail?.trim() || "tenant@email.com",
      address: property.address,
      organisation: property.organisation,
      priority: input.priority,
      status: "New",
      category: input.category,
      description: input.description.trim(),
      propertyId: property.id,
      createdAt: now,
      updatedAt: now,
    };
    const email: InboxEmail = {
      id: `mail-${jobNo}`,
      fromName: property.organisation,
      fromEmail: `repairs@${property.organisation.toLowerCase().replace(/\s+/g, "")}.co.uk`,
      subject: `${input.priority} — ${asTest ? "Test job" : input.category} at ${property.address}`,
      preview: input.description.slice(0, 110),
      body: input.description,
      receivedAt: now,
      read: false,
      jobId: jobNo,
      attachments: [],
    };
    const notification: NotificationItem = {
      id: `ntf-${jobNo}`,
      title: asTest ? "Test job created" : "New job raised",
      body: `Job ${jobNo} opened for ${property.address}.`,
      createdAt: now,
      read: false,
      href: `/jobs/${jobNo}`,
    };
    setState((current) => ({
      ...current,
      jobs: [created, ...current.jobs],
      emails: [email, ...current.emails],
      notifications: [notification, ...current.notifications],
    }));
    return created;
  }, [state.jobs, state.properties]);

  const createJob = useCallback(
    (input: CreateJobInput) => persistJob(input),
    [persistJob]
  );

  const createTestJob = useCallback(() => {
    return persistJob(
      {
        tenant: "Esteban Coronado",
        tenantPhone: "07700 900216",
        tenantEmail: "esteban.coronado@email.com",
        propertyId: "prop-sycamore",
        priority: "P1",
        category: "Heating",
        description:
          "Test job created from the operations dashboard. Boiler lockout reported — confirm heating and hot water on arrival.",
      },
      true
    );
  }, [persistJob]);

  const updateJob = useCallback(
    (id: string, patch: Partial<Pick<Job, "status" | "priority">>) => {
      setState((current) => ({
        ...current,
        jobs: current.jobs.map((job) =>
          job.id === id
            ? { ...job, ...patch, updatedAt: new Date().toISOString() }
            : job
        ),
      }));
    },
    []
  );

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
    setState(seedState());
  }, []);

  const value = useMemo<OperationsStore>(
    () => ({
      ...state,
      hydrated,
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
      markEmailRead,
      markNotificationsRead,
      resetDemo,
      state,
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
  return [job.jobNo, job.tenant, job.address, job.organisation, job.status, job.priority]
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

export const STATUSES: JobStatus[] = [
  "New",
  "Allocated",
  "In Progress",
  "On Hold",
  "Completed",
  "Cancelled",
];

export const PRIORITIES: Priority[] = ["P1", "P2", "P3", "P4"];
export const CATEGORIES: JobCategory[] = [
  "Heating",
  "Plumbing",
  "Electrical",
  "Damp",
  "Carpentry",
  "General",
];
