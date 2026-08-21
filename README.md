# TEDxSavannah Volunteers

The volunteer management app for **TEDxSavannah** (event day: **Saturday, May 15, 2027**).
One volunteer manager recruits roughly 35 volunteers from December through May; about 15
board members each need volunteers for the shifts they own; volunteers sign up, drop, swap,
and — on event day — show up (or don't). This app makes all of that calm.

- **Live:** deployed on Vercel from `main`
- **Get it running:** [SETUP.md](./SETUP.md) (hosting, email, first sign-in — no terminal needed)
- **Working on the code:** [CLAUDE.md](./CLAUDE.md) (hard rules and conventions for contributors, human or AI)

---

## What it does

### For volunteers
- **Join from one shared link** (`/join`) — name, email, optional phone. No password, ever.
- **Sign in by email** — a magic link, and every email the app sends carries a one-tap
  "open the app" button that signs you in.
- **Browse and grab shifts** grouped by day (the three event days: May 13, 14, 15) plus the
  spring **speaker-coaching sessions**. Every shift shows its time, place, description, and a
  live capacity meter ("3/6 · 3 spots left").
- **Waitlist** full shifts; when a spot opens, everyone waitlisted gets an email and the first
  to claim it wins.
- **Cancel in two taps**, with an optional note to the manager.
- **Messages** — a direct conversation with the volunteer manager, in the app or by simply
  replying to any email.
- **Add to calendar** (`.ics`) for each shift.

### For board members
- A **staffing dashboard** for the shifts they own — green/amber/red at a glance, expandable
  rosters with each volunteer's contact info.
- **Email their volunteers** (one shift's roster, or everyone across their shifts) — and nothing
  outside their own shifts.
- Their own conversation thread with the manager, like any volunteer.

### For the manager
- **Dashboard** — understaffed shifts, recent cancellations (with the volunteer's note and a
  one-click "message them"), unread messages, today's email budget.
- **Shifts** — create/edit/duplicate, set capacity, assign a board owner, choose a **standard
  time slot** or a custom time (the special-occasion escape hatch), publish/hide.
- **Rosters** — add or remove people (removal can send a note), promote from the waitlist,
  mark no-shows.
- **Volunteers** — contact details, private notes, shift history, deactivate, and a
  **copy sign-in link** tool for "I can't log in" moments.
- **Messaging** — broadcasts to everyone / all coaching volunteers / one roster / chosen
  people, with a live recipient preview; an **outbox** that shows every email ever sent,
  rendered; and per-person **conversation threads** (see below).
- **Check-in** — a phone-friendly event-day screen: big tap targets, live "9 of 25 here"
  counter, search, walk-up add, no-show marking.
- **Time travel** — simulate any date in the season to rehearse reminders, coaching season,
  and event morning before they happen.

---

## How the key flows work

### Signing in without passwords
Sessions are cookies backed by a `sessions` table. Sign-in links are signed JWTs
(`src/lib/tokens.ts`) that `/a/[token]` verifies before opening a session — the same
mechanism powers both `/signin` magic links (15-minute expiry) and the one-tap buttons in
every email (14 days). A new address at `/join` gets an account and a session immediately;
an existing address gets a magic link instead, so nobody can take over an account by typing
someone else's email. **No GET request ever changes data** — email scanners prefetch links,
so anything that mutates lands on a page with a confirm button.

### Signing up for a shift
Capacity is enforced inside a database transaction that locks the shift row
(`src/lib/signup-core.ts`), so two people racing for the last spot can't both get it. A full
shift offers the waitlist; a cancellation on a full shift emails the waitlist a claim link,
and the claim goes through the same transaction. Signups keep one row per person per shift
across cancel/re-signup cycles, with who cancelled (self or admin) and why.

### Cancellations
A volunteer's cancellation emails them a confirmation and emails the manager **and** the
shift's board owner an alert with the note — the backfill trigger. Cancellations also feed
the dashboard.

### Messaging and conversation threads
- **Broadcasts** (`src/lib/messaging.ts`) resolve an audience — everyone, all coaching
  volunteers, one roster, chosen people; board members are limited to their own shifts — and
  queue one email per recipient through the outbox.
- **Threads** (`src/lib/queries/threads.ts`, `src/lib/actions/thread-actions.ts`) — one
  conversation per volunteer/board member with the manager. The manager writes from the
  person's contact record; the person replies in the app (`/me/messages`) or just replies to
  the email.
- **Two-way Gmail sync** (`src/lib/email/imap-sync.ts`) — on every scheduler tick the app
  reads the manager's Gmail over IMAP with the same app password it sends with. Replies are
  matched to the right thread by `In-Reply-To`/`References` against the outbox's stored
  Message-IDs first (so a reply works even from a different address), then by sender. Any
  email from a known member is captured, and so is mail the manager sends a member directly
  from Gmail (read from the Sent folder; app-sent mail is excluded by an `X-TEDx-App` header
  and Message-ID match). Quoted history and signatures are stripped (`reply-clean.ts`).
  Ingested replies don't email the manager — they're already in the inbox — they show as
  unread badges.

### Email, reminders, and the scheduler
All outbound email goes through one choke point, `src/lib/email/outbox.ts`: transactional
mail sends immediately; bulk mail (broadcasts, reminders) is queued and drained within a daily
budget (`settings.dailyEmailBudget`, default 400) so Gmail's sending cap is never tripped —
overflow waits for the next run and the dashboard says so. Every email is logged and viewable
in Admin → Messages.

`/api/cron/tick` (`src/lib/scheduler.ts`) is the heartbeat: it queues shift reminders
(three days ahead and the morning of — one email per person per day, de-duplicated so it's
safe to run any number of times), drains the outbox, then syncs Gmail (time-boxed, with an
atomic lock so overlapping runs can't double-ingest). It's hit every ~10 minutes by a free
external pinger and once a day by Vercel's own cron as a backstop.

### Time travel
Every "what time is it" read in app logic goes through `now()` in `src/lib/clock.ts`, which
returns the simulated time when the admin panel sets one. Admin → Time travel offers season
presets (Dec 1 signups → Mar 9 coaching → May 12 reminders → May 15 event morning), a
"run the scheduler now" button, a "simulate an inbound email" tool that exercises the real
ingestion path without Gmail, and demo-season load/reset. The demo season's people use
plus-addressed variants of the manager's work email, so every test email lands in one inbox.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, Server Components, Server Actions), React 19, TypeScript |
| Data | PostgreSQL via Prisma 6 (Neon in production, Homebrew Postgres locally) |
| Styling | Tailwind CSS v4 with a small hand-built component kit (`src/components/ui.tsx`) — no UI library |
| Auth | Cookie sessions + `jose`-signed login tokens (no third-party auth) |
| Email out | Nodemailer over Gmail SMTP (app password); `console` transport for dev |
| Email in | `imapflow` + `mailparser` against Gmail IMAP |
| Validation | `zod` in every server action |
| Dates | `date-fns` / `date-fns-tz`; stored UTC, displayed in `America/New_York` |
| Tests | Vitest (unit, against a real local database) + Playwright (end-to-end, mobile viewport) |
| Hosting | Vercel (Hobby) + Neon (free); `vercel.json` adds the daily cron |

### Project map

```
prisma/schema.prisma        the whole data model        prisma/seed.ts   CLI seed (demo season)
src/app/(public)/           landing, /join, /signin
src/app/a/[token]/          one-tap sign-in from email links
src/app/(app)/shifts, /me   volunteer surfaces (+ /me/messages)
src/app/(app)/board/        board staffing dashboard + scoped messaging
src/app/(app)/admin/        manager: dashboard, shifts, slots, volunteers, board, messages, check-in, dev
src/app/api/cron/tick       scheduler heartbeat           src/app/api/ics/[signupId]  calendar files
src/lib/auth.ts             sessions and role guards      src/lib/tokens.ts  signed login links
src/lib/clock.ts            now() + time travel           src/lib/dates.ts   Savannah-time helpers
src/lib/signup-core.ts      capacity-safe signup transaction
src/lib/messaging.ts        broadcast audience resolution
src/lib/scheduler.ts        reminders + drain + Gmail sync
src/lib/email/              templates, transport (send.ts), outbox, imap-sync, reply-clean
src/lib/notify.ts           domain events -> transactional emails
src/lib/actions/            all server actions (auth, signup, admin, message, thread, dev)
src/lib/queries/            read helpers (shift board, admin options, threads)
src/lib/demo-data.ts        demo season (shared by CLI seed and the in-app button)
src/components/ui.tsx       design-system primitives      src/components/client/  interactive pieces
src/test/                   Vitest suites                 e2e/                    Playwright specs
```

### Data model (the short version)
`User` (role: VOLUNTEER / BOARD / MANAGER) · `Session` · `StandardSlot` (manager-defined shift
times) · `Shift` (event / coaching / general; capacity; optional board owner) · `Signup`
(confirmed / waitlisted / cancelled / checked-in / no-show) · `Message` (a broadcast) ·
`EmailLog` (every email: kind, status, provider Message-ID, dedupe key) · `ThreadMessage`
(conversation rows, direction + source, unread flags) · `Settings` (single row: reply-to,
email budget, simulated time, IMAP cursors).

---

## Running it locally

Prerequisites: **Node 22**, **PostgreSQL 16** (on a Mac: `brew install postgresql@16 &&
brew services start postgresql@16`), and Git.

```bash
git clone https://github.com/fitzhaile/ai-tedx-savannah-volunteers.git
cd ai-tedx-savannah-volunteers
npm install
cp .env.example .env          # then edit: DATABASE_URL, AUTH_SECRET, MANAGER_EMAIL, MANAGER_NAME
createdb tedx_dev             # whatever database your DATABASE_URL names
npm run db:migrate            # create the tables
npm run db:seed               # manager account + the demo season
npm run dev                   # http://localhost:3000
```

Sign in locally: with `EMAIL_TRANSPORT=console` no email is actually sent, so print yourself a
one-tap link instead:

```bash
npm run login-link -- you@example.com /admin
```

(Use the `MANAGER_EMAIL` address for the manager, or any demo volunteer's address from
Admin → Volunteers.) Everything the app "sends" in console mode is still recorded and viewable
in Admin → Messages → Outbox.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | `prisma generate` + `prisma migrate deploy` + `next build` (deploys migrate themselves) |
| `npm run lint` / `npm run typecheck` | ESLint / `tsc --noEmit` |
| `npm test` | Vitest unit suites (needs the local database) |
| `npx playwright test` | End-to-end suite (starts a production build on port 3100) |
| `npm run db:migrate` / `db:deploy` | Create a migration in dev / apply pending migrations |
| `npm run db:seed` | Rebuild the demo season (`SEED_DEMO=false SEED_WIPE=true` = wipe for real use) |
| `npm run db:studio` | Prisma Studio |
| `npm run login-link -- <email> [path]` | Print a sign-in link |

---

## Testing

- **Unit** (`src/test/`): the signup capacity race (two people, one spot), waitlist fallback,
  cancel/re-signup row reuse, outbox budget deferral, reminder de-duplication, reply-text
  cleaning across Gmail/Outlook/Apple quoting styles, and inbound-email attribution
  (reference matching with a mismatched sender, self/unknown/duplicate skips, Sent-folder
  de-duplication, multi-recipient fan-out).
- **End-to-end** (`e2e/`, iPhone-sized viewport): a volunteer joins, signs up (capacity meter
  updates), hits a full shift's waitlist, cancels with a reason; the manager sees the
  cancellation, creates a custom-time shift, time-travels to May 12 and fires the reminders,
  then runs event-morning check-in; and the full conversation-thread loop including a
  simulated email reply.

Run `npm test` and `npx playwright test` (first time: `npx playwright install chromium`).

---

## Deployment and operations

[SETUP.md](./SETUP.md) is the step-by-step. In short: a free **Neon** Postgres, a free
**Vercel** project connected to this repo, a **Gmail app password**, and a free
**cron-job.org** job pinging `/api/cron/tick` every 10 minutes. Deploys run database
migrations automatically; the manager account creates itself on first sign-in; the demo
season loads from a button. No terminal required.

### Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string (Neon: the direct, non-pooled one) |
| `AUTH_SECRET` | Signs sessions and login links — long and random |
| `APP_URL` | Public URL without trailing slash; used in every email link |
| `EMAIL_TRANSPORT` | `gmail` to send, `console` to only log |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` | The sending (and IMAP-read) Gmail account |
| `CRON_SECRET` | Bearer token / `?secret=` for `/api/cron/tick` |
| `MANAGER_EMAIL` / `MANAGER_NAME` | The manager account (auto-created on first sign-in) |
| `ENABLE_TIME_TRAVEL` | `true` shows Admin → Time travel; set `false` once volunteers are real |

### Day to day
- **Did an email go out?** Admin → Messages → Outbox shows every email, its status, and any
  error; click one to see it rendered. "Sent" means Gmail accepted it.
- **Replies not showing in threads?** The app reads the `GMAIL_USER` inbox; if the reply-to
  setting points elsewhere, Admin → Messages warns you. "Check for replies" forces a sync.
- **Going live after testing:** Admin → Time travel → *Reset for real volunteers*, then set
  `ENABLE_TIME_TRAVEL=false` and redeploy.

---

## Design

A "TEDx editorial" system: white paper, near-black ink, TEDx red `#EB0028` used sparingly.
**Bricolage Grotesque** carries display type (headlines, big numerals, the wordmark); **IBM Plex
Sans** carries body text. Capacity is drawn as one dot per spot — a nod to the red circle TED
speakers stand in. Hierarchy comes from type, hairlines, and thick black section rules rather
than boxed cards; buttons are pills; tags are small uppercase. Tokens live in
`src/app/globals.css`, primitives in `src/components/ui.tsx`. Email templates
(`src/lib/email/templates.ts`) mirror the look within what mail clients allow (inline styles,
tables, a Helvetica stack).

---

## Known limitations and trade-offs

- **Single season.** The model assumes one event; reusing it next year means either wiping
  (Admin → Time travel → Reset) or adding an events dimension.
- **Gmail as the mail system.** Sends come from the manager's personal address and are
  subject to Gmail's daily cap; the outbox budget keeps the app under it, but a busy day can
  defer bulk mail to the next run. Moving to a dedicated sending domain is a change confined
  to `src/lib/email/send.ts`.
- **Preview deployments share production.** Vercel previews use the production database and
  `APP_URL`, so their email links point at production.
- **Inbound attribution needs a hook.** A brand-new (non-reply) email from an address the app
  doesn't know can't be attributed to a thread and is skipped; real volunteers mail from their
  own address, so this mostly affects the demo's plus-addressed accounts.
- **First IMAP sync starts from "now."** Historical inbox mail is never imported; a mailbox
  rebuild (UIDVALIDITY change) fast-forwards rather than re-ingesting.
- **Scheduling depends on the pinger.** Vercel's free cron runs once a day; timely reminders
  and sync need the external 10-minute ping described in SETUP.md.
