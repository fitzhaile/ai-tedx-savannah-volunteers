"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/primitives";
import { syncInboxNowAction } from "@/lib/actions/thread-actions";

/** Manually pull replies from Gmail (the cron does this every ~10 minutes). */
export function SyncNowButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [summary, setSummary] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      {summary ? <span className="text-xs text-ink-soft">{summary}</span> : null}
      <Button
        variant="secondary"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await syncInboxNowAction();
            setSummary(r.summary);
            router.refresh();
          })
        }
      >
        {pending ? "Checking…" : "⟳ Check for replies"}
      </Button>
    </div>
  );
}
