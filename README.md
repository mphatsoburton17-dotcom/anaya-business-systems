# Anaya Business Systems

A category-aware business management app (retail, appointments/services, food & beverage, repair/trade) — products/services, orders, invoices, staff roles, expenses, and Excel reports.

## Run it locally first

You need [Node.js](https://nodejs.org) installed (version 18 or newer).

```bash
npm install
npm run dev
```

This opens the app at `http://localhost:5173` in your browser. Try it there before deploying.

## Deploy it for free (pick one)

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

Vercel is the simplest if you've never deployed a site before — it's basically one command.

## Branding & branches

- **Branding** (in the Documents tab → "Branding"): upload a logo, pick a brand color, set a business address, and add a signature — either drawn on-screen or uploaded as an image. These now show up on generated letters and on invoices.
  - **Honest limitation**: you can upload an "example document" (old letterhead, invoice, etc.) and the app will pick out a plausible brand color from it client-side. It **cannot** automatically pull out your actual logo, signature, or address from a photo of a document — that needs a real AI vision step, which isn't possible without a backend. That's flagged in the UI so it's clear this is a placeholder for now, ready to connect once the backend exists.
  - Images are resized down before being stored (localStorage has limited space), so don't expect print-shop resolution from the logo/signature.
- **Branches** (new "Branches" tab under More): add as many locations as the business has. A branch switcher sits at the top of the screen — pick a specific branch to record and view its sales/expenses/reports independently, or "All branches" to see everything combined. Each branch also shows a quick this-month performance card (revenue, expenses, order count) on the Branches screen. Note: the item/product catalog, customers, and staff list are currently shared across all branches — only orders and expenses are branch-specific for now.
- **Staff assigned to a branch**: when adding a staff member (Staff tab), you can assign them to a specific branch instead of leaving them on "All branches." Once assigned, switching into their account (via the role switcher at the top) automatically locks the app to that branch — they can't see or switch to other branches. Their sales are tagged with their branch and their name, and the resulting notification (Alerts tab) shows both, e.g. "Payment of MWK 5,000 received (by Chikondi) — Mangochi branch," so the owner can see who sold what, where, without the staff member needing broader access.

## Describe-your-business setup

At signup, instead of only picking from four fixed cards cold, you can describe your business in a sentence ("I run a small hair salon in Blantyre, mostly braiding") and tap "Suggest my setup" — it matches your words against the four business types (Retail, Appointment/Service, Food & Beverage, Repair/Trade) and pre-selects the closest one, with the matched word shown so it's clear why. You can always override it by tapping a different card.

**Honest limitation**: this is keyword matching, not real language understanding — it won't handle a genuinely unusual or hybrid business well, and it can't invent a brand-new dashboard from scratch for something none of the four types fit. Truly open-ended "describe anything, get a custom dashboard" needs a real AI model in the loop, which means a backend call — not something a static, offline-capable app like this can do on its own. This is a reasonable middle step until that's built.

## Staff roles

Three tiers now, instead of two:
- **Owner** — full access to everything, every branch, billing, and settings.
- **Manager** — new role. Sees Reports, Accounting, Documents, Marketing, and can add/manage staff, but only for their own assigned branch. Cannot reach Billing, Business settings, or manage other branches, and can't be switched to a different branch.
- **Staff** (e.g. "Sales Assistant") — records sales, sees customers and their own stats only.

Adding a staff member now also captures a fuller profile if you want it: position/job title, email address, phone number, age, home address, national ID/passport number, start date, and an emergency contact — click "Add more details" on the form. These show up under each person's name in the Staff list (tap to expand) and can be edited later. You can also attach a scanned offer letter (PDF or image) to each person's profile from their expanded details. All of it stays in this business's local storage, same as everything else — a backend + real authentication (so each person logs in from their own device instead of switching profiles inside the owner's session) is still a step for later, though branch access (below) now adds a lightweight password check for branch controllers.

**Salary, wage, and loan payments show up in Expenses**: when you log a payment for a staff member (Salary payment / Wage payment / Loan given) from their profile, it also creates a matching entry in Expenses and counts toward that branch's expense total on the Branches screen and toward Cash on hand — so all money going out is visible in one place. Loan repayments (money coming back in) don't create an expense entry. To avoid double-counting, these payroll-linked expense rows are excluded from the Payroll figure in Accounting/Reports (which is worked out directly from salary/hourly rate/pay records) but are included everywhere else.

**Branch access control**: from the Branches screen, an owner can assign one staff member exclusive control of a branch — enter their ID number, email, and a password. Once assigned, that branch's Expenses become locked: only that person (after unlocking their profile with the password via the role switcher at the top) can add or remove entries there. The owner can still view everything, just not edit it, until they remove that person's access.

## Packages & billing

The app now has a package system on top of the staff-seat plan:

- **Base plan** — 50,000 MWK/month, scaled by seat plan (Solo/Small/Medium/Large). Includes Core: sales, orders, items, customers, staff, invoices, price calculator.
- **First 30 days after registering** — everything is unlocked automatically (a full-access trial), tracked from `profile.createdAt`.
- **After the trial** — two paid add-ons, bought independently of the seat plan:
  - **Accounting** (15,000 MWK/month) — profit & loss, full ledger, accounts receivable (credit sales), balance sheet snapshot, Excel export
  - **Growth** (10,000 MWK/month) — Marketing + Documents bundled together
- If an add-on isn't active, its tab still appears but shows a paywall screen instead of the real data — nothing is deleted, just hidden until activated.
- Activating/deactivating a package currently just flips a flag in `profile.packages` (see `BillingPanel` in `src/App.jsx`) — **this simulates payment, same as the rest of the app's payment flow.** Wiring it to a real mobile money / card gateway is one of the backend items below.
- New: orders can be marked "On credit" (only when Accounting is unlocked), which tracks the amount as accounts receivable until it's marked paid from the Accounting tab.

## Important — read before relying on this in production

- **Real registration & login**: people now create an account with an email + password, go through business setup once, and log back in afterward. Your plan's staff size (chosen during setup) sets a hard seat limit — pick "Just me" and the Staff screen only allows 1 account until you register for a bigger plan.
- **Daily activity log**: every sale and expense is timestamped automatically. The "Daily activity" screen (under More) lets you step backward day by day, or jump to any date, and see exactly what happened that day — nothing needs to be manually "closed out."
- **Data storage**: accounts and business data are saved to the browser's `localStorage` on whatever device it's opened on. That means data does **not** sync between a phone and a laptop — each device has its own separate set of accounts. This is fine for testing, but a real multi-device business needs a proper backend database (see below).
- **Password security**: passwords are currently stored in plain text in the browser's local storage — this is a placeholder for a real backend with proper password hashing, not something to use with real customer passwords.
- **No real payments**: orders are marked "paid" instantly. No money actually moves. A live payment gateway (e.g. a mobile money API) needs to be integrated separately.
- **Marketing tools** (AI flyers, WhatsApp/email broadcasts, social auto-posting) are UI placeholders — they explain what's needed but don't send anything, since that requires paid third-party accounts (WhatsApp Business API, an email service, an AI image API) connected on the backend.

## What's next: moving to a real backend

To turn this into a real product usable by multiple businesses on multiple devices, you'll need:
1. A real database (e.g. PostgreSQL via Supabase, or Firebase) instead of localStorage — this is what would let the same account show the same data on a phone and a laptop
2. A real authentication system (e.g. Supabase Auth or Firebase Auth) with hashed passwords, instead of the current plain-text localStorage accounts
3. A payment gateway integration for subscriptions and in-app payments
4. Server-side API routes instead of everything running in the browser

This frontend is built so that swapping the account/storage functions near the top of `src/App.jsx` (`loadAccounts`, `saveAccounts`, `getSessionEmail`, `setSessionEmail`, `saveBizForAccount`) for real API calls is the main change needed — the rest of the app (UI, calculations, roles, daily activity) doesn't need to be rewritten.
