"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label, FieldHint } from "@/components/ui";
import {
  setSimulatedNowAction,
  runSchedulerAction,
  clearReminderHistoryAction,
} from "@/lib/actions/dev-actions";

const PRESETS: { label: string; value: string; hint: string }[] = [
  { label: "Dec 1, 2026", value: "2026-12-01T09:00", hint: "Signups open" },
  { label: "Mar 9, 2027", value: "2027-03-09T16:00", hint: "First coaching day" },
  { label: "Apr 20, 2027", value: "2027-04-20T12:00", hint: "Late coaching" },
  { label: "May 12, 2027", value: "2027-05-12T08:00", hint: "T-3 reminders fire" },
  { label: "May 14, 2027", value: "2027-05-14T15:00", hint: "Day before" },
  { label: "May 15, 2027", value: "2027-05-15T07:00", hint: "Event morning 🎬" },
];

export function TimeTravelPanel({ simulatedNow }: { simulatedNow: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [custom, setCustom] = useState("");
  const [schedResult, setSchedResult] = useState<string | null>(null);

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
                  `Queued ${r.remindersQueued} reminder${r.remindersQueued === 1 ? "" : "s"}, sent ${r.sent}, ${r.deferred} still queued${r.failed ? `, ${r.failed} failed` : ""}.`
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
        <h2 className="mb-1 text-sm font-extrabold text-ink">Fresh demo data</h2>
        <p className="text-sm text-ink-soft">
          To reset the entire demo season (volunteers, shifts, signups), run{" "}
          <code className="rounded bg-line/60 px-1.5 py-0.5 font-mono text-xs">npm run db:seed</code>{" "}
          from the project — it rebuilds everything except your manager account. Before real
          volunteers use the app, set{" "}
          <code className="rounded bg-line/60 px-1.5 py-0.5 font-mono text-xs">
            ENABLE_TIME_TRAVEL=false
          </code>{" "}
          to hide this panel.
        </p>
      </Card>
    </div>
  );
}
