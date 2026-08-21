"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label, FieldHint, Textarea } from "@/components/primitives";
import {
  setSimulatedNowAction,
  runSchedulerAction,
  clearReminderHistoryAction,
  loadDemoSeasonAction,
  resetForProductionAction,
  simulateInboundEmailAction,
  sendSampleEmailsAction,
} from "@/lib/actions/dev-actions";

const PRESETS: { label: string; value: string; hint: string }[] = [
  { label: "Dec 1, 2026", value: "2026-12-01T09:00", hint: "Signups open" },
  { label: "Mar 9, 2027", value: "2027-03-09T16:00", hint: "First coaching day" },
  { label: "Apr 20, 2027", value: "2027-04-20T12:00", hint: "Late coaching" },
  { label: "May 12, 2027", value: "2027-05-12T08:00", hint: "T-3 reminders fire" },
  { label: "May 14, 2027", value: "2027-05-14T15:00", hint: "Day before" },
  { label: "May 15, 2027", value: "2027-05-15T07:00", hint: "Event morning 🎬" },
];

export function TimeTravelPanel({
  simulatedNow,
  members,
}: {
  simulatedNow: string | null;
  members: { name: string; email: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [custom, setCustom] = useState("");
  const [schedResult, setSchedResult] = useState<string | null>(null);
  const [simFrom, setSimFrom] = useState("");
  const [simBody, setSimBody] = useState("");
  const [simReply, setSimReply] = useState(false);
  const [simResult, setSimResult] = useState<string | null>(null);

  const jump = (value: string | null) =>
    startTransition(async () => {
      await setSimulatedNowAction(value);
      router.refresh();
    });

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="mb-1 text-sm font-extrabold text-ink">Jump to a moment in the season</h2>
        <p className="mb-4 text-sm text-ink-soft">
          The whole app — shift lists, dashboards, reminders, check-in — follows the simulated
          clock. A banner shows everywhere while it&apos;s active.
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              disabled={pending}
              onClick={() => jump(p.value)}
              className="rounded-xl border border-line bg-card p-3 text-left transition-colors hover:border-ted disabled:opacity-50"
            >
              <p className="text-sm font-bold text-ink">{p.label}</p>
              <p className="text-xs text-ink-soft">{p.hint}</p>
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <div>
            <Label htmlFor="custom-dt">Or pick any date & time (Savannah)</Label>
            <Input
              id="custom-dt"
              type="datetime-local"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
            />
          </div>
          <Button variant="secondary" disabled={pending || !custom} onClick={() => jump(custom)}>
            Jump
          </Button>
          {simulatedNow ? (
            <Button variant="danger" disabled={pending} onClick={() => jump(null)}>
              ← Back to real time
            </Button>
          ) : null}
        </div>
      </Card>

      <Card>
        <h2 className="mb-1 text-sm font-extrabold text-ink">Run the scheduler now</h2>
        <p className="mb-3 text-sm text-ink-soft">
          Does exactly what the every-10-minutes cron does at the simulated time: queues any due
          shift reminders (3 days ahead + day-of) and sends queued email within the daily budget.
        </p>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await runSchedulerAction();
                setSchedResult(
                  `Queued ${r.remindersQueued} reminder${r.remindersQueued === 1 ? "" : "s"}, sent ${r.sent}, ${r.deferred} still queued${r.failed ? `, ${r.failed} failed` : ""}${r.imap.ran ? `, Gmail checked (+${r.imap.ingested ?? 0} replies)` : ""}.`
                );
                router.refresh();
              })
            }
          >
            {pending ? "Running…" : "▶ Run scheduler"}
          </Button>
          {schedResult ? <p className="text-sm font-semibold text-go">{schedResult}</p> : null}
        </div>
        <FieldHint>Check Admin → Messages afterwards to see what went out.</FieldHint>
      </Card>

      <Card>
        <h2 className="mb-1 text-sm font-extrabold text-ink">Simulate an inbound email</h2>
        <p className="mb-3 text-sm text-ink-soft">
          Pretend a volunteer emailed you back — the message goes through the exact same
          processing as real Gmail replies and lands in their conversation thread.
        </p>
        <div className="space-y-3">
          <div>
            <Label htmlFor="sim-from">From (a volunteer or board member&apos;s email)</Label>
            <Input
              id="sim-from"
              list="member-emails"
              placeholder="pick or type an email…"
              value={simFrom}
              onChange={(e) => setSimFrom(e.target.value)}
            />
            <datalist id="member-emails">
              {members.map((m) => (
                <option key={m.email} value={m.email}>
                  {m.name}
                </option>
              ))}
            </datalist>
          </div>
          <div>
            <Label htmlFor="sim-body">Message</Label>
            <Textarea
              id="sim-body"
              rows={3}
              placeholder="Hi Fitz — count me in for Saturday!"
              value={simBody}
              onChange={(e) => setSimBody(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={simReply}
              onChange={(e) => setSimReply(e.target.checked)}
            />
            Send as a reply to their latest email (tests reply-matching, works even with a
            different From address)
          </label>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              disabled={pending || !simFrom.trim() || !simBody.trim()}
              onClick={() =>
                startTransition(async () => {
                  const r = await simulateInboundEmailAction({
                    fromEmail: simFrom,
                    body: simBody,
                    replyToLatest: simReply,
                    toEmail: simReply ? simFrom : undefined,
                  });
                  setSimResult(r.detail);
                  if (r.ok) setSimBody("");
                  router.refresh();
                })
              }
            >
              Simulate email
            </Button>
            {simResult ? (
              <p className="text-sm font-semibold text-ink-soft">{simResult}</p>
            ) : null}
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-1 text-sm font-extrabold text-ink">Email templates</h2>
        <p className="mb-3 text-sm text-ink-soft">
          Send yourself one real example of every email the app can send (12 emails), so you can
          check how they look in an actual inbox. Each one also appears in Admin → Messages.
        </p>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setSchedResult(await sendSampleEmailsAction());
                router.refresh();
              })
            }
          >
            Email me one of each
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="mb-1 text-sm font-extrabold text-ink">Reset reminder history</h2>
        <p className="mb-3 text-sm text-ink-soft">
          Reminders only send once per volunteer per day. If you jump back in time to re-test
          them, clear the history first.
        </p>
        <Button
          variant="danger"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const n = await clearReminderHistoryAction();
              setSchedResult(`Cleared ${n} reminder record${n === 1 ? "" : "s"}.`);
              router.refresh();
            })
          }
        >
          Clear reminder history
        </Button>
      </Card>

      <Card>
        <h2 className="mb-1 text-sm font-extrabold text-ink">Demo data</h2>
        <p className="mb-3 text-sm text-ink-soft">
          The demo season fills the app with 15 pretend volunteers, two board members, and a
          full shift schedule. Volunteer addresses are plus-tagged variants of your work email
          (like{" "}
          <code className="rounded bg-line/60 px-1.5 py-0.5 font-mono text-xs">
            fitz+v3-tessa-okafor@fitzhaile.com
          </code>
          ), so everything the app &quot;sends them&quot; lands in your own inbox.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() => {
              if (
                confirm(
                  "Load the demo season? This replaces ALL current volunteers, shifts, and signups with fresh demo data. Your manager account stays."
                )
              )
                startTransition(async () => {
                  setSchedResult(await loadDemoSeasonAction());
                  router.refresh();
                });
            }}
          >
            Load demo season
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={pending}
            onClick={() => {
              if (
                confirm(
                  "Reset for real volunteers? This permanently deletes ALL volunteers, shifts, signups, messages, and email history — keeping only your manager account. Do this once, right before you start recruiting for real."
                )
              )
                startTransition(async () => {
                  setSchedResult(await resetForProductionAction());
                  router.refresh();
                });
            }}
          >
            Reset for real volunteers
          </Button>
        </div>
        <FieldHint>
          After resetting for real volunteers, set ENABLE_TIME_TRAVEL=false in your hosting
          settings to hide this panel entirely.
        </FieldHint>
      </Card>
    </div>
  );
}
