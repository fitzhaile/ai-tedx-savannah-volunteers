# TEDxSavannah Volunteers — project guide

Volunteer management app for TEDxSavannah (event: May 15, 2027). One manager,
~15 board members, ~35 volunteers. Next.js 15 (App Router, Server Actions),
Prisma 6 + Postgres, Tailwind v4, no component library. Deployed on Vercel +
Neon; email via the manager's Gmail (Nodemailer).

## Commands

```bash
npm run dev          # dev server (needs local Postgres, see below)
npm run build        # prisma generate + migrate deploy + next build (deploys auto-migrate)
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
npm test             # vitest
npm run db:migrate   # prisma migrate dev
npm run db:seed      # rebuild the demo season (keeps manager account)
npm run login-link -- <email> [path]   # print a sign-in link (local dev)
```

Local Postgres for dev: whatever `DATABASE_URL` in `.env` points at (Homebrew
Postgres on the default port 5432 works; `.env.example` has the shape).

## Hard rules

1. **Never call `new Date()` for "the current time" in app logic.** Use
   `now()` from `src/lib/clock.ts` — it returns the simulated time when the
   admin time-travel panel is active. (Real-time exceptions that are
   intentional: session expiry, email `sentAt`/budget accounting, and
   `cancelledAt` timestamps.)
2. **All outbound email goes through `src/lib/email/outbox.ts`**
   (`sendNow` for transactional, `enqueueEmail`+`drainOutbox` for bulk).
   Never call nodemailer or `deliver()` directly from features. Likewise all
   inbound mail — real IMAP or the dev simulator — goes through
   `ingestInboundEmail` in `src/lib/email/imap-sync.ts` (IMAP cursors and
   ingested-mail timestamps are sanctioned real-time exceptions to rule 1).
3. **No GET request may mutate app data.** Email links land on pages with a
   confirm button (email scanners prefetch links). `/a/[token]` only creates
   a session.
4. **Every server action and admin page re-checks authorization** via
   `requireUser` / `requireBoard` / `requireManager` from `src/lib/auth.ts`.
   Board members may only see/message rosters of shifts where
   `ownerId = them` (enforced in `src/lib/messaging.ts`).
5. **Times are stored UTC, displayed in Savannah time** via helpers in
   `src/lib/dates.ts` (`TZ = America/New_York`). Form datetime-local values
   are Savannah wall time — convert with `fromInputValue`/`toInputValue`.
6. Capacity is enforced inside a `FOR UPDATE` transaction
   (`src/lib/actions/signup-actions.ts`) — keep any new signup path inside
   `transactionalSignup`.

## Map

- `prisma/schema.prisma` — the whole data model; `prisma/seed.ts` — demo season
- `src/lib/` — `auth.ts` (sessions/guards), `tokens.ts` (signed login links),
  `clock.ts` (time travel), `scheduler.ts` (reminders + Gmail sync),
  `messaging.ts` (audience resolution), `email/` (templates, transport,
  outbox, `imap-sync.ts` two-way Gmail thread sync, `reply-clean.ts`),
  `queries/threads.ts` (conversation reads/unread counts)
- `src/lib/actions/` — all server actions (auth, signup, admin, message, dev)
- `src/app/(public)` — landing, /join, /signin; `src/app/a/[token]` — link sign-in
- `src/app/(app)` — authed: /shifts, /me, /board, /admin/**
- `src/app/api/cron/tick` — scheduler heartbeat (CRON_SECRET)
- `src/components/ui.tsx` — the design system primitives; `components/client/`
  — interactive pieces

## Conventions

- Server components fetch data; small client components handle interaction and
  call server actions, then `router.refresh()`.
- Forms use `useActionState` against actions returning `{ error?, ok? }`.
- Emails: add a kind to the `EmailKind` enum + a template branch in
  `src/lib/email/templates.ts` + a notify helper in `src/lib/notify.ts`.
- Conversation threads: one per non-manager user. Creation invariant:
  `unreadForManager` only on FROM_MEMBER rows, `unreadForMember` only on
  FROM_TEAM rows; viewing clears via POST server actions (never GET).
- UI text is warm and plain-spoken; volunteers are thanked, never blamed.
- Visual system ("TEDx editorial"): white paper, black ink, TEDx red `#EB0028`
  (`text-ted`/`bg-ted`); Bricolage Grotesque for display type (`font-display`,
  applied to h1–h3 globally), IBM Plex Sans for body. Capacity is shown as
  one dot per spot (`CapacityPill`) — the signature element; keep it. Prefer typographic hierarchy,
  hairlines, and `border-t-4 border-ink` section rules over boxed cards. Tokens
  live in `src/app/globals.css`; primitives (`PageHeader`, `SectionTitle`,
  `Eyebrow`, `Badge`, pill `Button`s) in `src/components/ui.tsx`.
- Commit messages: plain descriptions only — no Co-Authored-By lines,
  session links, or other AI-attribution footers.
