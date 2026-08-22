"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus } from "lucide-react";
import { Button, Badge, Input, Select, Label, EmptyState } from "@/components/primitives";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/client/Modal";
import { adminSetSignupStatus, adminAddToShift } from "@/lib/actions/admin-actions";
import { cn } from "@/lib/utils";

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
        // The add confirms them; after refresh their row appears and Check in
        // marks them present.
        router.refresh();
      }
      setWalkupBusy(false);
      setWalkupOpen(false);
      setWalkupUser("");
    });
  };

  return (
    <div>
      {/* Sticks just under the 3.5rem app header (AppShell). */}
      <div className="sticky top-14 z-20 -mx-4 mb-4 flex items-center justify-between gap-3 bg-background/95 px-4 py-3 backdrop-blur">
        <p className="font-display text-2xl font-bold text-foreground">
          <span className="text-ted">{checkedIn}</span> of {expected} here
        </p>
        <Button variant="secondary" size="sm" onClick={() => setWalkupOpen(true)}>
          <Plus data-icon="inline-start" />
          Walk-up
        </Button>
      </div>

      <Input
        placeholder="Find a name…"
        aria-label="Find a name"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-5"
      />

      <div className="space-y-5">
        {visible.map((s) => (
          <Card key={s.id}>
            <CardHeader>
              <CardTitle>
                <h2 className="text-base font-bold">{s.title}</h2>
              </CardTitle>
              <CardDescription>{s.timeRange}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {s.entries.map((e) => {
                  const st = statusOf(e);
                  return (
                    <li
                      key={e.signupId}
                      className={cn(
                        "flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0",
                        st === "NO_SHOW" && "opacity-60"
                      )}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-foreground">{e.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {e.phone ?? "no phone"} ·{" "}
                          <button
                            type="button"
                            onClick={() => markNoShow(e)}
                            className="font-semibold underline underline-offset-2 hover:text-foreground"
                          >
                            {st === "NO_SHOW" ? "undo no-show" : "no-show"}
                          </button>
                        </p>
                      </div>
                      {st === "NO_SHOW" ? (
                        <Badge tone="red">No-show</Badge>
                      ) : st === "CHECKED_IN" ? (
                        <Button
                          variant="primary"
                          className="w-28 bg-go text-white hover:bg-go/85"
                          aria-pressed="true"
                          onClick={() => toggle(e)}
                        >
                          <Check data-icon="inline-start" />
                          Here
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          className="w-28"
                          aria-pressed="false"
                          onClick={() => toggle(e)}
                        >
                          Check in
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        ))}
        {visible.length === 0 ? (
          <EmptyState
            title={q ? "No names match." : "No shifts on this day."}
            hint={q ? "Try a shorter search, or add them as a walk-up." : undefined}
          />
        ) : null}
      </div>

      <Modal open={walkupOpen} onClose={() => setWalkupOpen(false)} title="Walk-up volunteer">
        <p className="mb-4 text-sm text-muted-foreground">
          Adds them to a shift and the roster in one go — then tap Check in on their row.
        </p>
        <div className="space-y-4">
          <div>
            <Label htmlFor="walkup-user">Who showed up?</Label>
            <Select id="walkup-user" value={walkupUser} onChange={(e) => setWalkupUser(e.target.value)}>
              <option value="">Pick a volunteer…</option>
              {walkupCandidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="walkup-shift">Which shift?</Label>
            <Select id="walkup-shift" value={walkupShift} onChange={(e) => setWalkupShift(e.target.value)}>
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} · {s.timeRange}
                </option>
              ))}
            </Select>
          </div>
          <Button className="w-full" disabled={walkupBusy || !walkupUser} onClick={doWalkup}>
            {walkupBusy ? "Adding…" : "Add to shift"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
