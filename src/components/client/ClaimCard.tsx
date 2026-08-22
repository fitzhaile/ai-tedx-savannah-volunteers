"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/primitives";
import { claimSpot } from "@/lib/actions/signup-actions";

export function ClaimCard({ shiftId, shiftTitle, when }: { shiftId: string; shiftTitle: string; when: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  const claim = () =>
    startTransition(async () => {
      const r = await claimSpot(shiftId);
      if (r.ok && r.status === "confirmed") {
        setResult("It's yours! You're confirmed — check your email for details.");
      } else if (!r.ok && r.reason === "full") {
        setResult("Sorry — someone else claimed the spot first. You're still on the waitlist.");
      } else if (!r.ok && r.reason === "already") {
        setResult("You're already confirmed on this shift.");
      } else {
        setResult("This shift isn't available anymore.");
      }
      router.refresh();
    });

  return (
    <div className="mb-6 rounded-xl border-2 border-ted bg-ted-soft p-4">
      <p className="text-sm font-bold text-ted-dark">A spot opened up!</p>
      <p className="mt-0.5 text-sm text-foreground">
        {shiftTitle} · {when}
      </p>
      {result ? (
        <p className="mt-2 text-sm font-semibold text-foreground">{result}</p>
      ) : (
        <Button className="mt-3" disabled={pending} onClick={claim}>
          {pending ? "Claiming…" : "Claim this spot"}
        </Button>
      )}
    </div>
  );
}
