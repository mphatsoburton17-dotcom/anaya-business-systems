# Anaya Business Systems

A category-aware business management app — retail, appointments/services,
repair/trade, and property/rentals — covering products/services, orders,
invoices, staff roles, expenses, reports, and now real accounts, real
billing, and follow-up reminders.

**This README replaces the earlier version**, which described an older,
localStorage-only build. Most of the "important limitations" in that version
have since been resolved — see below for what's real now and what's still a
placeholder.

## Run it locally first

You need [Node.js](https://nodejs.org) installed (version 18 or newer).

```bash
npm install
npm run dev
```

This opens the app at `http://localhost:5173`. Try it there before deploying.

## What's real now (vs. the old localStorage version)

- **Real accounts, synced across devices** — Supabase Auth handles sign-up
  and login (hashed passwords, not plain text), and business data
  (`app_state`) is stored server-side in a `businesses` table, not the
  browser. The same login now shows the same data on a phone and a laptop.
- **Real payments** — plan upgrades and add-ons go through PayChangu
  (`paychangu-initiate` / `paychangu-verify` Edge Functions); nothing is
  simulated. A confirmed payment sets a real `subscriptionExpiresAt` date.
- **Automatic emails** — subscription renewal reminders, payment receipts,
  and weekly/monthly performance reports, sent via Supabase Edge Functions
  + Resend. See `supabase/README.md` for deployment steps — this part needs
  a one-time setup (Resend API key + cron schedule) before it's live.
- **Reminders tab** — a daily follow-up list (upcoming appointments, overdue
  credit balances) with one-tap WhatsApp/SMS click-to-chat messages. Sending
  is always a manual tap inside WhatsApp/Messages — nothing auto-sends.
- **Performance dashboard** — stat cards, a 6-month sales trend, sales-by-
  category and sales-by-branch/top-customer charts, and auto-generated
  insights, all on the Reports tab.
- **Installable app (PWA)** — can be added to a home screen and opens in its
  own window, with the app shell (UI) available even with no connection. See
  `pwa/README.md`. Actual data (sales, stock, balances) still needs a live
  connection — that's a separate, larger feature if you want it later.

## What's still a placeholder

- **Marketing tools** (AI flyers, WhatsApp/email broadcasts, social
  auto-posting) explain what they'd do but don't send anything yet — each
  needs its own paid third-party account (WhatsApp Business API, an email
  service, an AI image API) wired up server-side.
- **Branding from an uploaded document**: the app picks a plausible brand
  color out of an uploaded letterhead/invoice client-side, but can't pull out
  an actual logo, signature, or address from a photo — that needs a real AI
  vision step on a backend.
- **"Describe your business" setup** matches your sentence against known
  business types by keyword, not real language understanding — fine for
  nudging someone toward the right category, not a substitute for an AI
  model in the loop.
- **Staff still log in by switching profiles inside the owner's session**,
  not their own separate device login — branch-locked staff (below) add a
  password check, but it's not full per-person authentication yet.

## Deploy it (pick one)

### Option A — Vercel (easiest, recommended)
1. Create a free account at [vercel.com](https://vercel.com)
2. Install the Vercel CLI: `npm install -g vercel`
3. In this project folder, run: `vercel`
4. Follow the prompts (accept the defaults — it auto-detects Vite)
5. You'll get a live URL like `anaya-business-systems.vercel.app`

### Option B — Netlify
1. Create a free account at [netlify.com](https://netlify.com)
2. Run: `npm run build` (creates a `dist` folder)
3. Go to Netlify → "Add new site" → "Deploy manually" → drag in the `dist` folder
4. You'll get a live URL immediately

### Option C — GitHub Pages
1. Push this project to a GitHub repository
2. Run `npm install gh-pages --save-dev`
3. Add to `package.json` scripts: `"deploy": "npm run build && npx gh-pages -d dist"`
4. Add `"homepage": "https://<your-username>.github.io/<repo-name>"` to `package.json`
5. Run `npm run deploy`

Whichever you pick, also make sure your Supabase project URL/anon key are set
as environment variables for that host (however you're currently doing it
for local dev, e.g. `.env` → `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`).

## Business categories

Four top-level categories, each with subtypes that adjust labels, icons, and
available features (e.g. expiry-date tracking for Pharmacy, rent/occupancy
tracking for Property):
- **Retail** — grocery, clothing, electronics, hardware, furniture,
  pharmacy/chemist, agriculture, cosmetics, and more
- **Service/Appointments** — salons, restaurants, and other booking-based
  businesses
- **Repair/Trade**
- **Property/Rentals**

## Branding & branches

- **Branding** (Documents tab → "Branding"): logo, brand color, business
  address, and a signature (drawn or uploaded) — shown on generated letters
  and invoices. Images are resized before upload.
- **Branches** (Branches tab, under More): add as many locations as needed.
  A branch switcher at the top scopes recording and reports to one branch,
  or "All branches" combined. Each branch shows a quick this-month
  performance card. The item catalog, customers, and staff list are shared
  across branches — orders and expenses are branch-specific.
- **Staff assigned to a branch**: assigning a staff member to a branch locks
  their session to it once they switch into their profile — they can't see
  or switch to other branches. Their sales/expenses are tagged with their
  name and branch, and Alerts reflect both (e.g. "Payment of MWK 5,000
  received (by Chikondi) — Mangochi branch").

## Staff roles

- **Owner** — full access to everything, every branch, billing, and settings.
- **Manager** — Reports, Accounting, Documents, Marketing, and staff
  management, scoped to their own branch. No Billing, no Business settings,
  can't switch branches.
- **Staff** (e.g. "Sales Assistant") — records sales, sees customers and
  their own stats only.

Adding a staff member can capture a fuller profile (position, contact info,
ID number, start date, emergency contact, a scanned offer letter) via "Add
more details" on the form.

**Salary, wage, and loan payments** logged from a staff profile also create
a matching Expenses entry (and count toward that branch's totals and cash on
hand), excluded from the Payroll figure in Reports to avoid double-counting.
Loan repayments (money coming back in) don't create an expense entry.

**Branch access control**: an owner can give one staff member exclusive
control of a branch's Expenses (ID number, email, password). Once assigned,
only that person can add/remove entries there until the owner revokes it.

## Packages & billing

- **Starter** — MWK 20,000/month. Core: sales, items, customers, quotes,
  calendar, receipts.
- **Growth** — MWK 35,000/month. Adds Accounting, Expenses, Suppliers,
  Purchase Orders, Reports, Documents, and Staff & HR. Up to 2 branches, 2
  staff logins.
- **Pro** — MWK 50,000/month (or MWK 100,000 for 3 months). Everything in
  Growth, unlimited branches/staff logins, full Branches management, and one
  additional business included free.
- **Accounting add-on** — MWK 10,000/month, for Starter plans that want
  Accounting without upgrading to Growth.
- **First 7 days** after registering — every feature is unlocked (a full
  trial), tracked from `profile.createdAt`.
- Plan changes go through PayChangu; a confirmed payment sets
  `subscriptionExpiresAt` (30 days out, 90 for Pro's quarterly option) and
  triggers a payment-confirmation email.
- Orders can be marked "On credit" (Accounting required), tracked as
  receivables until marked paid.

## Setting up automatic emails and installability

These two pieces need one-time setup outside the app code itself — see:
- `supabase/README.md` — deploying the renewal/payment/report email functions
- `pwa/README.md` — making the app installable with offline app-shell support

## Project structure notes for whoever picks this up next

- Almost everything lives in `src/App.jsx` — category definitions, all
  panels/tabs, styles, and the Supabase read/write functions
  (`fetchBizForUser`, `persistBizForUser`, `loadActiveBiz`) near the top.
- `supabase/functions/` — Edge Functions for payments and email (Deno).
- `supabase/cron_setup.sql` — schedules the email Edge Functions.
- `public/manifest.webmanifest` + `public/icons/` — PWA install assets.
