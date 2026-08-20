"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveSlotAction, deleteSlotAction, type FormState } from "@/lib/actions/admin-actions";
import { Button, Input, Label, Card, FieldHint } from "@/components/ui";

export interface SlotRowData {
  id: string;
  label: string;
  startsAt: string; // datetime-local value
  endsAt: string;
  when: string;
  shiftCount: number;
}

function SlotForm({ slot, onDone }: { slot?: SlotRowData; onDone?: () => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    async (prev, fd) => {
      const r = await saveSlotAction(prev, fd);
      if (r.ok) onDone?.();
      return r;
    },
    {}
  );
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
      {slot ? <input type="hidden" name="id" value={slot.id} /> : null}
      <div>
        <Label htmlFor={`label-${slot?.id ?? "new"}`}>Label</Label>
        <Input
          id={`label-${slot?.id ?? "new"}`}
          name="label"
          defaultValue={slot?.label ?? ""}
          placeholder="e.g. Fri May 14 — Morning"
          required
          maxLength={80}
        />
      </div>
      <div>
        <Label className="text-xs">Starts</Label>
        <Input name="startsAt" type="datetime-local" defaultValue={slot?.startsAt ?? ""} required />
      </div>
      <div>
        <Label className="text-xs">Ends</Label>
        <Input name="endsAt" type="datetime-local" defaultValue={slot?.endsAt ?? ""} required />
      </div>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Saving…" : slot ? "Save" : "Add slot"}
      </Button>
      {state.error ? (
        <p className="text-sm font-semibold text-ted sm:col-span-4">{state.error}</p>
      ) : null}
    </form>
  );
}

export function SlotEditor({ slots }: { slots: SlotRowData[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      {slots.map((s) =>
        editing === s.id ? (
          <Card key={s.id}>
            <SlotForm
              slot={s}
              onDone={() => {
                setEditing(null);
                router.refresh();
              }}
            />
          </Card>
        ) : (
          <Card key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p className="text-sm font-bold text-ink">{s.label}</p>
              <p className="text-xs text-ink-soft">
                {s.when} · used by {s.shiftCount} shift{s.shiftCount === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex gap-1.5">
              <Button variant="ghost" size="sm" onClick={() => setEditing(s.id)}>
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => {
                  const msg =
                    s.shiftCount > 0
                      ? `Delete "${s.label}"? The ${s.shiftCount} existing shift(s) keep their times but lose the slot link.`
                      : `Delete "${s.label}"?`;
                  if (confirm(msg))
                    startTransition(async () => {
                      await deleteSlotAction(s.id);
                      router.refresh();
                    });
                }}
              >
                Delete
              </Button>
            </div>
          </Card>
        )
      )}

      <Card>
        <h3 className="mb-3 text-sm font-extrabold text-ink">Add a standard slot</h3>
        <SlotForm onDone={() => router.refresh()} />
        <FieldHint>
          Times are Savannah local time. Editing a slot later does not change shifts already
          created from it.
        </FieldHint>
      </Card>
    </div>
  );
}
