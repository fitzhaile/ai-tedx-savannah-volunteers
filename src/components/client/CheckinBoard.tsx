"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Badge, Input, Select, Card } from "@/components/ui";
import { Modal } from "@/components/client/Modal";
import { adminSetSignupStatus, adminAddToShift } from "@/lib/actions/admin-actions";
import { cn } from "@/lib/cn";

export interface CheckinEntry {
  signupId: string;
  userId: string;
  name: string;
  phone: string | null;
  status: "CONFIRMED" | "CHECKED_IN" | "NO_SHOW";
}

export interface CheckinShift {
  id: string;
  title: string;
  timeRange: string;
  entries: CheckinEntry[];
}

export function CheckinBoard({
  shifts,
  walkupCandidates,
}: {
  shifts: CheckinShift[];
  walkupCandidates: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  // Optimistic status overrides so taps feel instant on venue wifi.
  const [overrides, setOverrides] = useState<Record<string, CheckinEntry["status"]>>({});
  const [walkupOpen, setWalkupOpen] = useState(false);
  const [walkupUser, setWalkupUser] = useState("");
  const [walkupShift, setWalkupShift] = useState(shifts[0]?.id ?? "");
  const [walkupBusy, setWalkupBusy] = useState(false);

  const statusOf = (e: CheckinEntry) => overrides[e.signupId] ?? e.status;

  const { checkedIn, expected } = useMemo(() => {
    let c = 0;
    let t = 0;
    for (const s of shifts) {
      for (const e of s.entries) {
        const st = statusOf(e);
        if (st === "NO_SHOW") continue;
        t += 1;
        if (st === "CHECKED_IN") c += 1;
      }
    }
    return { checkedIn: c, expected: t };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shifts, overrides]);

  const toggle = (e: CheckinEntry) => {
    const next = statusOf(e) === "CHECKED_IN" ? "CONFIRMED" : "CHECKED_IN";
    setOverrides((prev) => ({ ...prev, [e.signupId]: next }));
    startTransition(async () => {
      await adminSetSignupStatus(e.signupId, next);
    });
  };

  const markNoShow = (e: CheckinEntry) => {
    const next = statusOf(e) === "NO_SHOW" ? "CONFIRMED" : "NO_SHOW";
    setOverrides((prev) => ({ ...prev, [e.signupId]: next }));
    startTransition(async () => {
      await adminSetSignupStatus(e.signupId, next);
    });
  };

  const q = query.trim().toLowerCase();
  const visible = shifts
    .map((s) => ({
      ...s,
      entries: q ? s.entries.filter((e) => e.name.toLowerCase().includes(q)) : s.entries,
    }))
    .filter((s) => s.entries.length > 0);

  const doWalkup = () => {
    if (!walkupUser || !walkupShift) return;
    setWalkupBusy(true);
    startTransition(async () => {
      const r = await adminAddToShift(walkupShift, walkupUser);
      if (r.ok) {
        // Find their new signup and check them in server-side on refresh; the
        // add confirms them — immediately mark checked in via a second call
        // once the page refreshes with the new signupId.
        router.refresh();
      }
      setWalkupBusy(false);
      setWalkupOpen(false);
      setWalkupUser("");
    });
  };

  return (
    <div>
      <div className="sticky top-24 z-30 -mx-4 mb-4 flex items-center justify-between gap-3 bg-paper/95 px-4 py-2 backdrop-blur">
        <p className="text-lg font-extrabold text-ink">
          <span className="text-ted">{checkedIn}</span> of {expected} here
        </p>
        <Button variant="secondary" size="sm" onClick={() => setWalkupOpen(true)}>
          + Walk-up
        </Button>
      </div>

      <Input
        placeholder="Find a name…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-5"
      />

      <div className="space-y-6">
        {visible.map((s) => (
          <section key={s.id}>
            <h2 className="mb-2 text-sm font-extrabold text-ink">
              {s.title} <span className="font-semibold text-ink-soft">· {s.timeRange}</span>
            </h2>
            <div className="space-y-2">
              {s.entries.map((e) => {
                const st = statusOf(e);
                return (
                  <Card
                    key={e.signupId}
                    className={cn(
                      "flex items-center justify-between gap-3 py-3",
                      st === "CHECKED_IN" && "border-go bg-go-soft/40",
                      st === "NO_SHOW" && "opacity-60"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-base font-bold text-ink">{e.name}</p>
                      <p className="text-xs text-ink-soft">
                        {e.phone ?? "no phone"} ·{" "}
                        <button
                          type="button"
                          onClick={() => markNoShow(e)}
                          className="font-semibold text-ink-faint underline"
                        >
                          {st === "NO_SHOW" ? "undo no-show" : "no-show"}
                        </button>
                      </p>
                    </div>
                    {st === "NO_SHOW" ? (
                      <Badge tone="red">No-show</Badge>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggle(e)}
                        className={cn(
                          "min-w-28 rounded-xl px-4 py-3 text-sm font-extrabold transition-colors",
                          st === "CHECKED_IN"
                            ? "bg-go text-white"
                            : "border-2 border-line bg-card text-ink-soft active:border-go"
                        )}
                      >
                        {st === "CHECKED_IN" ? "✓ Here" : "Check in"}
                      </button>
                    )}
                  </Card>
                );
              })}
            </div>
          </section>
        ))}
        {visible.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-faint">
            {q ? "No names match." : "No shifts on this day."}
          </p>
        ) : null}
      </div>

      <Modal open={walkupOpen} onClose={() => setWalkupOpen(false)} title="Walk-up volunteer">
        <p className="mb-3 text-sm text-ink-soft">
          Adds them to a shift and the roster in one go — then tap Check in on their row.
        </p>
        <div className="space-y-3">
          <Select value={walkupUser} onChange={(e) => setWalkupUser(e.target.value)}>
            <option value="">Who showed up?</option>
            {walkupCandidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select value={walkupShift} onChange={(e) => setWalkupShift(e.target.value)}>
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} · {s.timeRange}
              </option>
            ))}
          </Select>
          <Button className="w-full" disabled={walkupBusy || !walkupUser} onClick={doWalkup}>
            {walkupBusy ? "Adding…" : "Add to shift"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
