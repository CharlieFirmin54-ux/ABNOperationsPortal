# ABN Property Maintenance Operations Portal

Dark-themed operations dashboard for **ABN Property Maintenance** — jobs, properties, repair emails, and workload reports.

The interface follows the black / white / red operations theme, with the ABN Property Maintenance logo in the sidebar.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:43127](http://localhost:43127).

## What you can do

- Review P1, open, completed, and total job counts on the dashboard
- Raise a test job or a full works order
- Filter and open jobs, change status/priority, and add notes
- Browse contracted properties and their job history
- Read repair emails from **Yahoo Mail over IMAP** (or demo seed mail if IMAP is not set up)
- Open a **Yahoo mailbox** in a new tab and reply from Yahoo compose
- Check a simple workload report

Data is stored in this browser so the portal runs without a database. Use **Settings → Reset demo data** to restore the seed jobs.

## Yahoo inbox (IMAP)

The Emails page fetches the real Yahoo inbox over IMAP. It does not only link out to Yahoo.

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

Open [http://localhost:43127/emails](http://localhost:43127/emails) and use **Refresh**. Until those variables are set, the page shows a setup notice and demo repair emails so it is never blank. If IMAP sign-in or the network fails, the error is shown and demo mail is used as a fallback.

## Stack

Next.js, TypeScript, Tailwind CSS, and shadcn/ui. The footer lists Supabase as the intended shared store; this slice uses local storage until credentials are added.
