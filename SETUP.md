# Setting up TEDxSavannah Volunteers

Follow these once, top to bottom, and the app is live. Everything here uses free tiers.

## 1. Database — Neon (free)

1. Go to [neon.tech](https://neon.tech) and create a free account.
2. Create a project (name it `tedx-volunteers`, region: US East).
3. On the project dashboard, copy the **connection string** — make sure the
   "Pooled connection" option is selected. It looks like
   `postgresql://user:pass@ep-xxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require`.
4. That value is your `DATABASE_URL`.

## 2. Gmail app password (for sending email)

1. Your Google account needs 2-Step Verification: [myaccount.google.com/security](https://myaccount.google.com/security).
2. Then go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
3. Create one named `TEDx Volunteers` and copy the 16-character password.
4. That's `GMAIL_APP_PASSWORD`; `GMAIL_USER` is your Gmail address.

> Gmail allows ~500 emails/day — plenty for 35 volunteers. Every email the app
> sends comes **from you** and replies land in your regular inbox.
> Later, if you want a `volunteers.tedxsavannah.com` sender instead, that's a
> small change confined to `src/lib/email/send.ts` (e.g. switch to Resend).

## 3. Deploy — Vercel (free)

1. Go to [vercel.com](https://vercel.com), sign up with your GitHub account.
2. **Add New → Project**, import this repository. Framework: Next.js (auto-detected).
3. Before deploying, open **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | from step 1 |
   | `AUTH_SECRET` | run `openssl rand -base64 32` (or any long random string) |
   | `APP_URL` | your app URL, e.g. `https://tedx-volunteers.vercel.app` (add it after the first deploy if you don't know it yet) |
   | `EMAIL_TRANSPORT` | `gmail` (or `console` to test without sending) |
   | `GMAIL_USER` | your Gmail address |
   | `GMAIL_APP_PASSWORD` | from step 2 |
   | `CRON_SECRET` | another long random string |
   | `MANAGER_EMAIL` | your Gmail address (this becomes the manager account) |
   | `MANAGER_NAME` | your name |
   | `ENABLE_TIME_TRAVEL` | `true` while testing; `false` once volunteers are real |

4. Deploy. When it finishes, set `APP_URL` to the real URL (Settings →
   Environment Variables) and redeploy.

## 4. Create the database tables + demo season

From your own machine (or any terminal with the repo):

```bash
npm install
DATABASE_URL="<your Neon URL>" npx prisma migrate deploy   # create tables
DATABASE_URL="<your Neon URL>" MANAGER_EMAIL="you@gmail.com" MANAGER_NAME="Your Name" npm run db:seed
```

The seed builds a full **demo season**: 15 fake volunteers (their addresses are
plus-tagged versions of yours, like `you+vol3@gmail.com`, so every email the
app sends them lands in *your* inbox), event shifts on May 13–15 2027,
coaching sessions in March–April, waitlists, cancellations.

When you're done testing and want a clean slate for real volunteers:

```bash
DATABASE_URL="..." MANAGER_EMAIL="you@gmail.com" SEED_DEMO=false SEED_WIPE=true npm run db:seed
```

That deletes every demo volunteer, shift, and email record — keeping only your
manager account and settings.

## 5. The scheduler ping (reminders + queued email)

The app sends reminders and drains its email queue whenever
`/api/cron/tick` is hit. Vercel's built-in daily cron is already configured
(`vercel.json`), but for timely sending add a free 10-minute pinger:

1. Go to [cron-job.org](https://cron-job.org) and create a free account.
2. Create a cronjob: URL
   `https://<your-app>/api/cron/tick?secret=<your CRON_SECRET>`,
   every **10 minutes**.
3. Save. Done — reminders now go out the morning they're due.

## 6. Try it

- Visit the app → **Sign in** with your Gmail → magic link arrives → you're
  the manager.
- Open **Admin → ⏱ Time travel** and jump to *May 12* → **Run scheduler** →
  check **Admin → Messages** and your inbox: the T-3 reminders for event day.
- Jump to *May 15, 7am* → **Admin → Check-in** and play with the big toggles.
- Open an incognito window → `/join` → sign up as a test volunteer → grab a
  shift → cancel it — watch the cancel alert land in your inbox.
- Share `https://<your-app>/join` when you're ready to recruit for real
  (and set `ENABLE_TIME_TRAVEL` to `false`, then redeploy).

## Day-to-day cheatsheet

| I want to… | Where |
|---|---|
| Add/edit shifts, set capacity | Admin → Shifts |
| Set the standard shift times | Admin → Standard times |
| See who dropped a shift & why | Admin dashboard → Recent cancellations (you also get an email) |
| Remove someone from a shift, with a note | Admin → Shifts → open shift → Remove |
| Email everyone / coaching crew / one roster / one person | Admin → Messages → New message |
| Give a board member their own dashboard | Admin → Board → Add (then assign them shifts) |
| Someone can't sign in | Admin → Volunteers → open them → Copy sign-in link, text it to them |
| Event-day arrivals | Admin → Check-in (works great on a phone) |
