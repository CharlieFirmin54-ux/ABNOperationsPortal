export type Priority = "P1" | "Normal";
export type JobStatus = "Open" | "TT Contacted" | "Completed";
export type JobCategory =
  | "Heating"
  | "Plumbing"
  | "Electrical"
  | "Damp"
  | "Carpentry"
  | "General"
  | "House Renovations";

export type JobOrigin = "mailbox" | "local";

export type Job = {
  id: string;
  jobNo: string;
  tenant: string;
  tenantPhone: string;
  tenantEmail: string;
  address: string;
  organisation: string;
  priority: Priority;
  status: JobStatus;
  category: JobCategory;
  description: string;
  propertyId: string;
  createdAt: string;
  updatedAt: string;
  origin?: JobOrigin;
};

export type Property = {
  id: string;
  name: string;
  address: string;
  postcode: string;
  organisation: string;
  tenant: string;
  type: string;
  bedrooms: number;
};

export type EmailAttachment = {
  partId: string;
  filename: string;
  contentType: string;
  size: number;
};

export type InboxEmail = {
  id: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  preview: string;
  body: string;
  receivedAt: string;
  read: boolean;
  jobId?: string;
  attachments?: EmailAttachment[];
};

export type InboxSource = "yahoo" | "demo" | "unconfigured" | "error";

export type JobNote = {
  id: string;
  jobId: string;
  author: string;
  body: string;
  createdAt: string;
};

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  href?: string;
};

export type InboxFetchResult = {
  source: InboxSource;
  configured: boolean;
  mailbox: string | null;
  error: string | null;
  emails: InboxEmail[];
};

export type JobsFetchResult = {
  source: InboxSource;
  configured: boolean;
  mailbox: string | null;
  error: string | null;
  jobs: Job[];
  properties: Property[];
  emails: InboxEmail[];
  notifications: NotificationItem[];
};
