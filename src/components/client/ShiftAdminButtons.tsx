"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui";
import { duplicateShiftAction, deleteShiftAction } from "@/lib/actions/admin-actions";

export function ShiftAdminButtons({
  shiftId,
  rosterCount,
}: {
  shiftId: string;
  rosterCount: number;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      <Button
        variant="secondary"
        size="sm"
        disabled={pending}
        onClick={() => startTransition(() => duplicateShiftAction(shiftId))}
      >
        Duplicate
      </Button>
      <Button
        variant="danger"
        size="sm"
        disabled={pending}
        onClick={() => {
          const warning =
            rosterCount > 0
              ? `Delete this shift? ${rosterCount} ${rosterCount === 1 ? "person is" : "people are"} signed up — they will NOT be emailed automatically. Consider removing them (with a note) first.`
              : "Delete this shift? This can't be undone.";
          if (confirm(warning)) startTransition(() => deleteShiftAction(shiftId));
        }}
      >
        Delete
      </Button>
    </div>
  );
}
