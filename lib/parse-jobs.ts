import {
  HOUSE_RENOVATIONS_CATEGORY,
  isHouseRenovationText,
} from "@/lib/house-renovations";
import type {
  InboxEmail,
  Job,
  JobCategory,
  JobStatus,
  NotificationItem,
  Priority,
  Property,
} from "@/lib/types";

const UK_POSTCODE =
  /\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/i;

const JOB_NO_RE =
  /(?:jobsheet|job\s*(?:no\.?|number|#)|works\s*order)\s*[:.]?\s*(\d{4,6})\b/i;

const SUBJECT_JOBSHEET_RE =
  /^jobsheet\s+(\d{4,6})\s*:\s*(.+?)\s+for\s+(.+)$/i;

const P1_RE = /\bP1\b/i;

const JOBSHEET_LABELS = [
  "Date Issued",
  "Due Date",
  "Address",
  "Viewing",
  "Notes",
  "Key No",
  "Tenant Info",
  "Job Details",
  "Quoted Price",
  "For and on behalf of",
  "Authorised by",
  "Invoice to",
] as const;

const SKIP_SUBJECT =
  /\b(failure notice|undeliverable|delivery status|password|sign[- ]?in|unusual (?:sign|activity)|verify your (?:account|email)|security (?:code|alert)|account alert|prize draw|how did we do|order was unsuccessful|parcel pickup|latest arrivals|back-to-?\s*school|flexible payment|simplify business|introducing the new)\b/i;

const SKIP_FROM_LOCAL =
  /^(mailer-daemon|noreply|no-reply|newsletter|research|surveys?)$/i;

const MARKETING_DOMAINS = [
  "amazon.co.uk",
  "amazon.com",
  "business.amazon.co.uk",
  "screwfix.com",
  "surveys.screwfix.com",
  "apple.com",
  "insideapple.apple.com",
  "birdcontroluk.com",
];

const JOB_POSITIVE =
  /\b(jobsheet|works\s+order|repair\s+report|job\s*no\.?\s*\d{4,6}|maintenance (?:job|request)|raised (?:a )?job)\b/i;

const KNOWN_AGENTS: Record<string, string> = {
  "baselets.net": "Baselets",
  "baselets.co.uk": "Baselets",
  "flagship-housing.org": "Flagship Housing",
  "havebury.com": "Havebury Housing",
};

export type MailboxBuild = {
  jobs: Job[];
  properties: Property[];
  emails: InboxEmail[];
  notifications: NotificationItem[];
};

function domainOf(email: string): string {
  const at = email.lastIndexOf("@");
  return at >= 0 ? email.slice(at + 1).toLowerCase() : "";
}

function localPartOf(email: string): string {
  const at = email.indexOf("@");
  return at > 0 ? email.slice(0, at) : email;
}

function collapseWs(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function isYahooAccountMail(email: InboxEmail): boolean {
  const domain = domainOf(email.fromEmail);
  const yahoo =
    domain === "yahoo.com" ||
    domain === "yahoo.co.uk" ||
    domain.endsWith(".yahoo.com") ||
    domain.endsWith(".mail.yahoo.com");
  if (!yahoo) return false;

  const subject = email.subject || "";
  const fromLocal = localPartOf(email.fromEmail);
  const fromName = email.fromName || "";
  return (
    SKIP_FROM_LOCAL.test(fromLocal) ||
    SKIP_FROM_LOCAL.test(fromName) ||
    SKIP_SUBJECT.test(subject) ||
    /\b(account|security|sign[- ]?in|password|verify)\b/i.test(subject)
  );
}

export function isIgnoredMailboxEmail(email: InboxEmail): boolean {
  if (isYahooAccountMail(email)) return true;

  const domain = domainOf(email.fromEmail);
  const subject = email.subject || "";
  const fromLocal = localPartOf(email.fromEmail);

  if (SKIP_FROM_LOCAL.test(fromLocal)) return true;
  if (SKIP_SUBJECT.test(subject)) return true;
  if (MARKETING_DOMAINS.some((item) => domain === item || domain.endsWith(`.${item}`))) {
    return true;
  }

  if (/\b(invoice|payment|order confirmation|copy of invoice)\b/i.test(subject)) {
    return !JOB_POSITIVE.test(`${email.subject}\n${email.body}`);
  }

  return false;
}

export function isJobRelatedEmail(email: InboxEmail): boolean {
  if (isIgnoredMailboxEmail(email)) return false;
  const haystack = `${email.subject}\n${email.body}`;
  return (
    JOB_POSITIVE.test(haystack) ||
    SUBJECT_JOBSHEET_RE.test(email.subject) ||
    isHouseRenovationText(email.subject, email.body)
  );
}

function extractJobNumber(subject: string, body: string): string | null {
  const fromSubject = SUBJECT_JOBSHEET_RE.exec(subject);
  if (fromSubject) return fromSubject[1];
  const match = JOB_NO_RE.exec(`${subject}\n${body}`);
  return match ? match[1] : null;
}

function sliceUntil(text: string, stop: RegExp): string {
  const cut = stop.exec(text);
  return (cut ? text.slice(0, cut.index) : text).trim();
}

function labeledField(body: string, label: string): string {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `${escaped}\\s*\\.?\\s*:\\s*([\\s\\S]*?)(?=${JOBSHEET_LABELS.map(
      (item) => item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\.?\\s*:"
    ).join("|")}|$)`,
    "i"
  );
  const match = re.exec(body);
  return match ? collapseWs(match[1]) : "";
}

function jobsheetTitle(subject: string, body: string): string {
  const fromSubject = SUBJECT_JOBSHEET_RE.exec(subject);
  if (fromSubject) return collapseWs(fromSubject[2]);

  const afterNo = /job\s*no\.?\s*\d{4,6}\s*:?\s*([\s\S]*?)(?=date issued|$)/i.exec(
    body
  );
  if (afterNo) {
    const title = collapseWs(afterNo[1]);
    if (title && title.length < 80) return title;
  }
  return collapseWs(subject.replace(/^re:\s*/i, ""));
}

function parseUkDate(value: string, fallback: string): string {
  const match = /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(value);
  if (!match) return fallback;
  const day = Number(match[1]);
  const month = Number(match[2]);
  let year = Number(match[3]);
  if (year < 100) year += 2000;
  const date = new Date(Date.UTC(year, month - 1, day, 8, 0, 0));
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toISOString();
}

function extractPostcode(value: string): string {
  const match = UK_POSTCODE.exec(value.toUpperCase());
  if (!match) return "";
  const compact = match[1].replace(/\s+/g, "");
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}

function addressFromSubject(subject: string): string {
  const match = SUBJECT_JOBSHEET_RE.exec(subject);
  return match ? collapseWs(match[3]) : "";
}

function parseAddress(subject: string, body: string): string {
  const labeled = labeledField(body, "Address");
  if (labeled) {
    const cleaned = sliceUntil(
      labeled,
      /\b(viewing|notes|key no|tenant info)\b/i
    );
    if (cleaned.length >= 6) return cleaned;
  }

  const fromSubject = addressFromSubject(subject);
  if (fromSubject) return fromSubject;

  const line = body.split(/\n/).find((item) => UK_POSTCODE.test(item));
  return line ? collapseWs(line) : "";
}

function parseTenantBlock(raw: string): {
  tenant: string;
  tenantPhone: string;
  tenantEmail: string;
} {
  const text = collapseWs(raw);
  if (!text || /^(n\/?a|none|-)$/i.test(text)) {
    return { tenant: "Not recorded", tenantPhone: "", tenantEmail: "" };
  }

  const emailMatch = /email:\s*([^\s]+@[^\s]+)/i.exec(text);
  const tenantEmail = emailMatch ? emailMatch[1].replace(/[>,]+$/, "") : "";

  const phoneMatch =
    /(?:tel:?\s*(?:\([mw]\))?\s*|mobile:?\s*)(\+?\d[\d\s-]{8,16}\d)/i.exec(
      text
    ) || /(\b0\d[\d\s-]{8,14}\d\b)/.exec(text);
  const tenantPhone = phoneMatch ? phoneMatch[1].replace(/\s+/g, " ").trim() : "";

  const nameChunk = text
    .split(/\bTel:|\bemail:|\bmobile:/i)[0]
    .replace(/\s*\(m\)\s*/gi, " ")
    .trim();
  const tenant = collapseWs(nameChunk).replace(/[,-]+$/, "").trim();

  return {
    tenant:
      tenant && /[a-zA-Z]/.test(tenant) && tenant.length < 80
        ? tenant
        : "Not recorded",
    tenantPhone,
    tenantEmail,
  };
}

function organisationFromEmail(email: InboxEmail, body: string): string {
  const domain = domainOf(email.fromEmail);
  if (KNOWN_AGENTS[domain]) return KNOWN_AGENTS[domain];
  for (const [suffix, name] of Object.entries(KNOWN_AGENTS)) {
    if (domain.endsWith(`.${suffix}`)) return name;
  }

  if (/baselets/i.test(`${email.fromName} ${email.fromEmail} ${body}`)) {
    return "Baselets";
  }

  const fromName = collapseWs(email.fromName);
  if (fromName && !/maintenance|jobsheet|noreply/i.test(fromName)) {
    return fromName;
  }

  return "Letting agent";
}

function parsePriority(subject: string, body: string, title: string): Priority {
  const haystack = `${subject}\n${title}\n${body}`;
  if (P1_RE.test(haystack)) return "P1";

  if (
    /\b(emergency|no heating|no hot water|boiler (?:down|lockout|not firing)|burst pipe)\b/i.test(
      haystack
    )
  ) {
    return "P1";
  }
  return "Normal";
}

function parseStatus(subject: string, body: string): JobStatus {
  const haystack = `${subject}\n${body}`;
  if (/\b(cancelled|cancel the job)\b/i.test(haystack)) return "Completed";
  if (/\b(completed|completion confirmation|works complete|job closed)\b/i.test(haystack)) {
    return "Completed";
  }
  if (
    /\b(tt contacted|tenant contacted|spoke (?:to|with) (?:the )?tenant|tenant informed|left (?:a )?voicemail|left (?:a )?message (?:for|with) (?:the )?tenant)\b/i.test(
      haystack
    )
  ) {
    return "TT Contacted";
  }
  return "Open";
}

function parseCategory(
  title: string,
  description: string,
  subject: string,
  body: string
): JobCategory {
  if (isHouseRenovationText(subject, title, description, body)) {
    return HOUSE_RENOVATIONS_CATEGORY;
  }
  const titleText = title.toLowerCase();
  const fromTitle = categoryFromText(titleText);
  if (fromTitle) return fromTitle;
  if (/\bbird\b/.test(titleText)) {
    return "General";
  }
  return categoryFromText(description.toLowerCase()) ?? "General";
}

function categoryFromText(haystack: string): JobCategory | null {
  if (/\b(mould|damp|condensation)\b/.test(haystack)) return "Damp";
  if (/\b(heat|boiler|radiator|hot water|heating|thermostat)\b/.test(haystack)) {
    return "Heating";
  }
  if (/\belectric|\b(eicr|socket|outlet|consumer unit|alarm|cmd|extractor)\b/.test(haystack)) {
    return "Electrical";
  }
  if (/\b(leak|toilet|tap|plumb|sink|cistern)\b/.test(haystack)) {
    return "Plumbing";
  }
  if (/\b(door|hinge|window|carpentry|lock|handle|wardrobe)\b/.test(haystack)) {
    return "Carpentry";
  }
  return null;
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "property";
}

export function propertyIdFromAddress(address: string): string {
  const postcode = extractPostcode(address).toLowerCase().replace(/\s+/g, "");
  const line = address.split(",")[0] || address;
  return `prop-${slugify(line)}${postcode ? `-${postcode}` : ""}`;
}

function inferBedrooms(description: string): number {
  let max = 0;
  const re = /bedroom\s+(\d+)/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(description))) {
    max = Math.max(max, Number(match[1]));
  }
  return max;
}

function inferType(description: string, address: string): string {
  const haystack = `${description} ${address}`.toLowerCase();
  if (/\b(flat|apartment|maisonette)\b/.test(haystack)) return "Flat";
  return "House";
}

function parseJobFromEmail(email: InboxEmail): Job | null {
  if (!isJobRelatedEmail(email)) return null;

  const jobNo = extractJobNumber(email.subject, email.body);
  const title = jobsheetTitle(email.subject, email.body);
  const address = parseAddress(email.subject, email.body);
  const details = labeledField(email.body, "Job Details");
  const description = details || collapseWs(email.body).slice(0, 1200) || title;
  const tenant = parseTenantBlock(labeledField(email.body, "Tenant Info"));
  const issued = labeledField(email.body, "Date Issued");
  const createdAt = parseUkDate(issued, email.receivedAt);
  const id = jobNo || email.id.replace(/^yahoo-/, "job-");

  return {
    id,
    jobNo: jobNo || id.replace(/^job-/, ""),
    tenant: tenant.tenant,
    tenantPhone: tenant.tenantPhone,
    tenantEmail: tenant.tenantEmail,
    address: address || "Address not stated",
    organisation: organisationFromEmail(email, email.body),
    priority: parsePriority(email.subject, email.body, title),
    status: parseStatus(email.subject, email.body),
    category: parseCategory(title, description, email.subject, email.body),
    description: description.slice(0, 4000),
    propertyId: address ? propertyIdFromAddress(address) : "prop-unspecified",
    createdAt,
    updatedAt: email.receivedAt,
    origin: "mailbox",
  };
}

function preferHouseRenovations(
  primary: JobCategory,
  secondary?: JobCategory
): JobCategory {
  if (
    primary === HOUSE_RENOVATIONS_CATEGORY ||
    secondary === HOUSE_RENOVATIONS_CATEGORY
  ) {
    return HOUSE_RENOVATIONS_CATEGORY;
  }
  return primary;
}

function scoreJob(job: Job): number {
  let score = job.description.length;
  if (job.address !== "Address not stated") score += 200;
  if (job.tenant !== "Not recorded") score += 80;
  if (job.tenantPhone) score += 20;
  return score;
}

function propertyFromJob(job: Job): Property | null {
  if (!job.address || job.address === "Address not stated") return null;
  const postcode = extractPostcode(job.address);
  return {
    id: job.propertyId,
    name: job.address.split(",")[0]?.trim() || job.address,
    address: job.address,
    postcode,
    organisation: job.organisation,
    tenant: job.tenant === "Not recorded" ? "" : job.tenant,
    type: inferType(job.description, job.address),
    bedrooms: inferBedrooms(job.description),
  };
}

function normalizeAddressKey(address: string): string {
  return collapseWs(address)
    .toLowerCase()
    .replace(/\b(beck row|suffolk)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function linkEmailToJob(email: InboxEmail, jobs: Job[]): string | undefined {
  if (isIgnoredMailboxEmail(email)) return undefined;

  const jobNo = extractJobNumber(email.subject, email.body);
  if (jobNo) {
    const match = jobs.find((job) => job.jobNo === jobNo);
    if (match) return match.id;
  }

  const haystack = `${email.subject}\n${email.body}`.toLowerCase();
  const hits = jobs.filter((job) => {
    if (job.address === "Address not stated") return false;
    const name = job.address.split(",")[0]?.trim().toLowerCase();
    if (name && haystack.includes(name)) return true;
    const key = normalizeAddressKey(job.address);
    const tokens = key.split(" ").filter(Boolean);
    const short = tokens.slice(0, 2).join(" ");
    return short.length > 4 && haystack.includes(short);
  });
  if (hits.length === 1) return hits[0].id;
  return undefined;
}

export function buildMailboxFromEmails(emails: InboxEmail[]): MailboxBuild {
  const parsed: Array<{ email: InboxEmail; job: Job }> = [];
  for (const email of emails) {
    const job = parseJobFromEmail(email);
    if (job) parsed.push({ email, job });
  }

  const byKey = new Map<string, Job>();
  for (const { job } of parsed) {
    const existing = byKey.get(job.jobNo);
    if (!existing || scoreJob(job) > scoreJob(existing)) {
      byKey.set(job.jobNo, {
        ...job,
        category: preferHouseRenovations(job.category, existing?.category),
      });
    } else if (new Date(job.updatedAt) > new Date(existing.updatedAt)) {
      byKey.set(job.jobNo, {
        ...existing,
        updatedAt: job.updatedAt,
        category: preferHouseRenovations(existing.category, job.category),
        description:
          job.description.length > existing.description.length
            ? job.description
            : existing.description,
      });
    } else if (job.category === HOUSE_RENOVATIONS_CATEGORY) {
      byKey.set(job.jobNo, {
        ...existing,
        category: HOUSE_RENOVATIONS_CATEGORY,
      });
    }
  }

  const jobs = [...byKey.values()].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const propertyMap = new Map<string, Property>();
  for (const job of jobs) {
    const property = propertyFromJob(job);
    if (!property) continue;
    const current = propertyMap.get(property.id);
    if (!current) {
      propertyMap.set(property.id, property);
      continue;
    }
    propertyMap.set(property.id, {
      ...current,
      tenant: current.tenant || property.tenant,
      bedrooms: Math.max(current.bedrooms, property.bedrooms),
    });
  }

  const linkedEmails = emails.map((email) => {
    const jobId = linkEmailToJob(email, jobs);
    return jobId ? { ...email, jobId } : email;
  });

  const notifications: NotificationItem[] = jobs
    .filter((job) => job.priority === "P1" || job.status === "Open")
    .slice(0, 8)
    .map((job) => ({
      id: `ntf-${job.id}`,
      title: job.priority === "P1" ? `New ${job.priority} job` : "Job from mailbox",
      body: `Job ${job.jobNo} — ${job.address}.`,
      createdAt: job.updatedAt,
      read: false,
      href: `/jobs/${job.id}`,
    }));

  return {
    jobs,
    properties: [...propertyMap.values()].sort((a, b) =>
      a.address.localeCompare(b.address)
    ),
    emails: linkedEmails,
    notifications,
  };
}
