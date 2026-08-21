"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Badge, Textarea, Label, Select, FieldHint } from "@/components/primitives";
import { Modal } from "@/components/client/Modal";
import {
  adminAddToShift,
  adminRemoveFromShift,
  adminSetSignupStatus,
} from "@/lib/actions/admin-actions";

export interface RosterEntry {
  signupId: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  status: "CONFIRMED" | "WAITLISTED" | "CHECKED_IN" | "NO_SHOW";
}

export function RosterPanel({
  shiftId,
  entries,
  capacity,
  candidates,
}: {
  shiftId: string;
  entries: RosterEntry[];
  capacity: number;
  candidates: { id: string; name: string; email: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [removeTarget, setRemoveTarget] = useState<RosterEntry | null>(null);
  const [note, setNote] = useState("");
  const [notify, setNotify] = useState(true);
  const [addId, setAddId] = useState("");

  const confirmed = entries.filter((e) => e.status === "CONFIRMED" || e.status === "CHECKED_IN");
  const noShows = entries.filter((e) => e.status === "NO_SHOW");
  const waitlist = entries.filter((e) => e.status === "WAITLISTED");

  const refresh = () => router.refresh();

  const add = () => {
    if (!addId) return;
    startTransition(async () => {
      await adminAddToShift(shiftId, addId);
      setAddId("");
      refresh();
    });
  };

  const doRemove = () => {
    if (!removeTarget) return;
    startTransition(async () => {
      await adminRemoveFromShift(removeTarget.signupId, note, notify);
      setRemoveTarget(null);
      setNote("");
      setNotify(true);
      refresh();
    });
  };

  const setStatus = (signupId: string, status: "CONFIRMED" | "NO_SHOW") =>
    startTransition(async () => {
      await adminSetSignupStatus(signupId, status);
      refresh();
    });

  const Row = ({ e, actions }: { e: RosterEntry; actions: React.ReactNode }) => (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2.5 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-bold text-ink">
          {e.name}
          {e.status === "CHECKED_IN" ? (
            <Badge tone="green" className="ml-2">
              Checked in
            </Badge>
          ) : null}
          {e.status === "NO_SHOW" ? (
            <Badge tone="red" className="ml-2">
              No-show
            </Badge>
          ) : null}
        </p>
        <p className="text-xs text-ink-soft">
          {e.email}
          {e.phone ? ` · ${e.phone}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 gap-1.5">{actions}</div>
    </div>
  );

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-extrabold text-ink">
          Roster · {confirmed.length}/{capacity}
        </h3>
        {confirmed.length > capacity ? <Badge tone="amber">Over capacity</Badge> : null}
      </div>

      {confirmed.length === 0 ? (
        <p className="py-3 text-sm text-ink-faint">Nobody yet.</p>
      ) : (
        confirmed.map((e) => (
          <Row
            key={e.signupId}
            e={e}
            actions={
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => setStatus(e.signupId, "NO_SHOW")}
                >
                  No-show
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={pending}
                  onClick={() => setRemoveTarget(e)}
                >
                  Remove
                </Button>
              </>
            }
          />
        ))
      )}

      {noShows.length > 0 ? (
        <>
          <h4 className="mt-4 mb-1 text-xs font-extrabold tracking-wide text-ink-soft uppercase">
            No-shows
          </h4>
          {noShows.map((e) => (
            <Row
              key={e.signupId}
              e={e}
              actions={
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => setStatus(e.signupId, "CONFIRMED")}
                >
                  Undo
                </Button>
              }
            />
          ))}
        </>
      ) : null}

      {waitlist.length > 0 ? (
        <>
          <h4 className="mt-4 mb-1 text-xs font-extrabold tracking-wide text-ink-soft uppercase">
            Waitlist · {waitlist.length}
          </h4>
          {waitlist.map((e) => (
            <Row
              key={e.signupId}
              e={e}
              actions={
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        await adminAddToShift(shiftId, e.userId);
                        refresh();
                      })
                    }
                  >
                    Promote
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => setRemoveTarget(e)}
                  >
                    Remove
                  </Button>
                </>
              }
            />
          ))}
        </>
      ) : null}

      <div className="mt-4 border-t border-line pt-4">
        <Label htmlFor="add-volunteer">Add someone to this shift</Label>
        <div className="flex gap-2">
          <Select
            id="add-volunteer"
            value={addId}
            onChange={(e) => setAddId(e.target.value)}
            className="flex-1"
          >
            <option value="">Pick a person…</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.email})
              </option>
            ))}
          </Select>
          <Button variant="secondary" disabled={pending || !addId} onClick={add}>
            Add
          </Button>
        </div>
        {confirmed.length >= capacity ? (
          <FieldHint>Heads up: this shift is already at capacity — adding more overfills it.</FieldHint>
        ) : (
          <FieldHint>They&apos;ll get the usual confirmation email.</FieldHint>
        )}
      </div>

      <Modal
        open={removeTarget !== null}
        onClose={() => setRemoveTarget(null)}
        title={`Remove ${removeTarget?.name ?? ""} from this shift?`}
      >
        <div className="mb-3">
          <Label htmlFor="remove-note">Add a note (optional)</Label>
          <Textarea
            id="remove-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. We moved you to the afternoon shift instead — see you then!"
            maxLength={500}
          />
        </div>
        <label className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink">
          <input
            type="checkbox"
            checked={notify}
            onChange={(e) => setNotify(e.target.checked)}
            className="h-4 w-4 accent-ted"
          />
          Email them about this change
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setRemoveTarget(null)} disabled={pending}>
            Never mind
          </Button>
          <Button variant="danger" onClick={doRemove} disabled={pending}>
            {pending ? "Removing…" : "Remove from shift"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
