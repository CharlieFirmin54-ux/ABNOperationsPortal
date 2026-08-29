# ABN Property Maintenance Operations Portal

Dark-themed operations dashboard for **ABN Property Maintenance** — jobs, properties, repair emails, and workload reports.

The interface follows the black / white / red operations theme, with the ABN Property Maintenance logo in the sidebar.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:43127](http://localhost:43127). Everyone on the team uses the same login:

- **Username:** `ABN2026`
- **Password:** `BeckRowABN!`

Change that pair with `AUTH_USERNAME` and `AUTH_PASSWORD` in `.env.local` or on Vercel if you need to.

## Production (operations.abnmaintenance.co.uk)

## Production (operations.abnmaintenance.co.uk)

Intended public hostname: **[operations.abnmaintenance.co.uk](https://operations.abnmaintenance.co.uk)**

This is a Next.js app with live Yahoo IMAP, so it needs a Node.js host (Vercel is the default). IONOS DNS currently points `operations` at a parking page (`217.160.0.70`), not this portal. IONOS shared Apache hosting cannot run the IMAP API routes.

### Deploy on Vercel

1. Install the Vercel CLI and log in (`npx vercel login`).
2. From the repo root:

```bash
npx vercel --prod --yes
```

3. In the Vercel project, set **Production** environment variables (never commit `.env.local` or passwords):

```bash
YAHOO_EMAIL
YAHOO_APP_PASSWORD
```

Login does not need extra AUTH keys. The team username and password are built in (`ABN2026` / `BeckRowABN!`). Optional overrides: `AUTH_USERNAME`, `AUTH_PASSWORD`, `AUTH_SECRET`.

Optional: `YAHOO_IMAP_HOST` (default `imap.mail.yahoo.com`), `YAHOO_IMAP_PORT` (default `993`). Copy mailbox values from local `.env.local`. Preview deployments need the same vars if you want the live mailbox there too.

4. Attach the custom domain:

```bash
npx vercel domains add operations.abnmaintenance.co.uk
```

Confirm with `npx vercel domains inspect operations.abnmaintenance.co.uk` and use the CNAME Vercel prints if it differs from the table below.

`npm run build` must succeed before you deploy. IMAP routes already use the Node.js runtime (`maxDuration` 30–60s). Hobby plans cap serverless time at 10s, so mailbox refresh may need a Pro plan if Yahoo is slow.

### DNS (IONOS)

The zone uses IONOS nameservers (`ns1116.ui-dns.org`, `ns1048.ui-dns.com`, `ns1056.ui-dns.de`, `ns1053.ui-dns.biz`). DNS cannot be changed from this environment. In the IONOS DNS panel for `abnmaintenance.co.uk`, **replace** the current `operations` A (`217.160.0.70`) and AAAA (`2001:8d8:100f:f000::200`) records with:

| Type | Host / Name | Value | TTL |
| --- | --- | --- | --- |
| CNAME | `operations` | `cname.vercel-dns-0.com` | 3600 (or default) |

If IONOS refuses a CNAME because an A/AAAA already exists, delete those `operations` records first, then add the CNAME. Leave the apex `abnmaintenance.co.uk` records alone unless you also intend to move the root domain.

Fallback if a CNAME is not accepted:

| Type | Host / Name | Value |
| --- | --- | --- |
| A | `operations` | `76.76.21.21` |

After DNS updates, Vercel issues HTTPS automatically. Until those records change, `https://operations.abnmaintenance.co.uk` is still the IONOS parking page (HTTPS currently fails there). Local preview stays on [http://localhost:43127](http://localhost:43127).

## What you can do

- Sign in with the shared team username and password
- Review P1, Open, Completed, and TT Contacted job counts on the dashboard
- Raise a test job or a full works order
- Filter jobs by P1, Open, TT Contacted, or Completed, then update those flags and add notes
- Browse properties derived from jobsheet addresses
- Read repair emails from **Yahoo Mail over IMAP**
- Open a **Yahoo mailbox** in a new tab and reply from Yahoo compose
- Check a simple workload report

Jobs are parsed from the connected mailbox (jobsheets and repair reports). Local status changes and notes stay in this browser. Use **Settings → Clear local notes and status changes** to drop those edits and re-sync from mail.

## Team login

The portal uses a signed httpOnly session cookie. Everyone shares one username and password:

- Username: `ABN2026`
- Password: `BeckRowABN!`

| Variable | Purpose |
| --- | --- |
| `AUTH_USERNAME` / `AUTH_PASSWORD` | Optional. Override the team login. |
| `AUTH_SECRET` | Optional. Signs the session cookie. The app falls back if it is missing. |

## Yahoo inbox (IMAP)

## Yahoo inbox (IMAP)

The Emails page and the jobs list fetch the real Yahoo inbox over IMAP. It does not only link out to Yahoo.

1. In Yahoo **Account Security**, turn on two-step verification.
2. Generate an **app password**: Account Security → App passwords (or Generate app password) → choose **Mail**. Copy the 16-character password.
3. In Yahoo Mail settings, confirm **IMAP** is enabled.
4. Copy `.env.example` to `.env.local` (never commit `.env.local`) and set:

```bash
YAHOO_EMAIL=you@yahoo.com
YAHOO_APP_PASSWORD=your-app-password
```

Optional: `YAHOO_IMAP_HOST` defaults to `imap.mail.yahoo.com` (port 993, TLS). Username is the full email address. Password must be the app password, not the Yahoo account password.

5. Restart the app:

```bash
npm run dev
```

Open [http://localhost:43127](http://localhost:43127) or [http://localhost:43127/emails](http://localhost:43127/emails) and use **Refresh**. Until those variables are set, pages show a connect-mailbox notice and stay empty — demo jobs are not loaded. If IMAP sign-in or the network fails, the error is shown and the portal does not fall back to placeholder data.

Yahoo security/account messages and supplier marketing are skipped. Only maintenance jobsheets and similar repair reports become jobs.

## Stack

Next.js, TypeScript, Tailwind CSS, and shadcn/ui. The footer lists Supabase as the intended shared store; this slice uses local storage until credentials are added.
