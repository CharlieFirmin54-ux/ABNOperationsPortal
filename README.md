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
- Read repair emails and open a **Yahoo mailbox** in a new tab
- Check a simple workload report

Data is stored in this browser so the portal runs without a database. Use **Settings → Reset demo data** to restore the seed jobs.

## Stack

Next.js, TypeScript, Tailwind CSS, and shadcn/ui. The footer lists Supabase as the intended shared store; this slice uses local storage until credentials are added.
