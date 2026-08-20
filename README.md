# TEDxSavannah Volunteers

The volunteer management app for TEDxSavannah (May 15, 2027): shift signup
with capacity limits, speaker-coaching sessions, board-member staffing
dashboards, email broadcasts and reminders, waitlists, cancellations with
manager alerts, and day-of check-in.

- **Get it running:** see [SETUP.md](./SETUP.md) — free hosting on
  Vercel + Neon, email through the manager's Gmail.
- **How the code is organized:** see [CLAUDE.md](./CLAUDE.md).

Built with Next.js 15, Prisma 6 + Postgres, and Tailwind v4. Magic-link
sign-in (no passwords); every email contains a one-tap sign-in button. A
built-in **time-travel panel** (Admin → ⏱ Time travel) simulates any moment
in the season so the whole flow — December signups, March coaching, event-week
reminders, event-morning check-in — can be rehearsed today.
