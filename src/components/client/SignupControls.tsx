"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Badge, Textarea, Label, FieldHint } from "@/components/ui";
import { Modal } from "@/components/client/Modal";
import {
  signUpForShift,
  joinWaitlist,
  cancelMySignup,
  type SignupResult,
} from "@/lib/actions/signup-actions";

export interface MySignupInfo {
  id: string;
  status: "CONFIRMED" | "WAITLISTED" | "CHECKED_IN" | "NO_SHOW" | "CANCELLED";
}

export function SignupControls({
  shiftId,
  shiftTitle,
  my,
  full,
  past,
}: {
  shiftId: string;
  shiftTitle: string;
  my: MySignupInfo | null;
  full: boolean;
  past: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [note, setNote] = useState("");

  const handleResult = (r: SignupResult) => {
    if (r.ok) {
      setMessage(
        r.status === "confirmed" ? "You're on the roster! Check your email." : "You're on the waitlist — we'll email you if a spot opens."
      );
    } else if (r.reason === "full") {
      setMessage("That shift just filled up — you can join the waitlist.");
    } else if (r.reason === "past") {
      setMessage("This shift has already ended.");
    } else if (r.reason === "already") {
      setMessage("You're already on this shift.");
    } else {
      setMessage("This shift isn't available right now.");
    }
    router.refresh();
  };

  const act = (fn: () => Promise<SignupResult>) => {
    setMessage(null);
    startTransition(async () => handleResult(await fn()));
  };

  const doCancel = () => {
    startTransition(async () => {
      const r = await cancelMySignup(my!.id, note);
      setCancelOpen(false);
      setNote("");
      setMessage(r.ok ? "You've been taken off this shift." : r.error);
      router.refresh();
    });
  };

  if (past) {
    return <Badge>Ended</Badge>;
  }

  const active = my && my.status !== "CANCELLED" && my.status !== "NO_SHOW" ? my : null;

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      {active ? (
        <div className="flex items-center gap-2">
          {active.status === "WAITLISTED" ? (
            <Badge tone="amber">On the waitlist</Badge>
          ) : (
            <Badge tone="green">✓ You&apos;re signed up</Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => setCancelOpen(true)}
          >
            {active.status === "WAITLISTED" ? "Leave waitlist" : "Cancel"}
          </Button>
        </div>
      ) : full ? (
        <Button
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={() => act(() => joinWaitlist(shiftId))}
        >
          {pending ? "Joining…" : "Join waitlist"}
        </Button>
      ) : (
        <Button size="sm" disabled={pending} onClick={() => act(() => signUpForShift(shiftId))}>
          {pending ? "Signing up…" : "Sign up"}
        </Button>
      )}
      {message ? <p className="max-w-52 text-right text-xs text-ink-soft">{message}</p> : null}

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title={active?.status === "WAITLISTED" ? "Leave the waitlist?" : "Cancel this shift?"}
      >
        <p className="mb-3 text-sm text-ink-soft">
          {active?.status === "WAITLISTED"
            ? `You'll be removed from the waitlist for “${shiftTitle}”.`
            : `You'll be taken off the roster for “${shiftTitle}” and the spot opens up for someone else.`}
        </p>
        {active?.status !== "WAITLISTED" ? (
          <div className="mb-4">
            <Label htmlFor={`note-${shiftId}`}>Anything we should know? (optional)</Label>
            <Textarea
              id={`note-${shiftId}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Schedule conflict came up — sorry! I could still do an afternoon shift."
              maxLength={500}
            />
            <FieldHint>Your note goes straight to the volunteer manager.</FieldHint>
          </div>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setCancelOpen(false)} disabled={pending}>
            Keep my spot
          </Button>
          <Button variant="danger" onClick={doCancel} disabled={pending}>
            {pending ? "Cancelling…" : "Yes, cancel"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
