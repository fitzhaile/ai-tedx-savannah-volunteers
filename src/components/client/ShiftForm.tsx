"use client";

import { useActionState, useState } from "react";
import { saveShiftAction, type FormState } from "@/lib/actions/admin-actions";
import { Button, Input, Label, Select, Textarea, FieldHint } from "@/components/ui";

export interface SlotOption {
  id: string;
  label: string;
  when: string;
}

export interface ShiftFormValues {
  id?: string;
  title: string;
  category: "EVENT" | "COACHING" | "GENERAL";
  slotId: string | null;
  startsAt: string; // datetime-local value (Savannah time)
  endsAt: string;
  capacity: number;
  location: string;
  description: string;
  ownerId: string;
  isPublished: boolean;
}

export function ShiftForm({
  shift,
  slots,
  boardMembers,
}: {
  shift?: ShiftFormValues;
  slots: SlotOption[];
  boardMembers: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveShiftAction, {});
  const [timeMode, setTimeMode] = useState<"slot" | "custom">(
    shift && !shift.slotId ? "custom" : "slot"
  );

  return (
    <form action={action} className="space-y-4">
      {shift?.id ? <input type="hidden" name="id" value={shift.id} /> : null}
      <input type="hidden" name="timeMode" value={timeMode} />

      <div>
        <Label htmlFor="title">Shift title</Label>
        <Input
          id="title"
          name="title"
          defaultValue={shift?.title ?? ""}
          placeholder="e.g. Registration Desk"
          required
          maxLength={120}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="category">Category</Label>
          <Select id="category" name="category" defaultValue={shift?.category ?? "EVENT"}>
            <option value="EVENT">Event (the three days)</option>
            <option value="COACHING">Speaker coaching</option>
            <option value="GENERAL">Other</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="capacity">Volunteers needed</Label>
          <Input
            id="capacity"
            name="capacity"
            type="number"
            min={1}
            max={200}
            defaultValue={shift?.capacity ?? 2}
            required
          />
          <FieldHint>Volunteers see this limit before signing up.</FieldHint>
        </div>
      </div>

      <div>
        <Label>When</Label>
        <div className="mb-2 flex gap-1 rounded-lg bg-line/50 p-1">
          <button
            type="button"
            onClick={() => setTimeMode("slot")}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-semibold ${timeMode === "slot" ? "bg-card text-ink shadow-xs" : "text-ink-soft"}`}
          >
            Standard time slot
          </button>
          <button
            type="button"
            onClick={() => setTimeMode("custom")}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-semibold ${timeMode === "custom" ? "bg-card text-ink shadow-xs" : "text-ink-soft"}`}
          >
            Custom time
          </button>
        </div>
        {timeMode === "slot" ? (
          <>
            <Select name="slotId" defaultValue={shift?.slotId ?? ""} required>
              <option value="" disabled>
                Pick a standard slot…
              </option>
              {slots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} ({s.when})
                </option>
              ))}
            </Select>
            <FieldHint>
              Standard slots keep everyone&apos;s asks aligned. Manage them under Standard times.
            </FieldHint>
          </>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="startsAt" className="text-xs">
                Starts (Savannah time)
              </Label>
              <Input
                id="startsAt"
                name="startsAt"
                type="datetime-local"
                defaultValue={shift?.startsAt ?? ""}
                required
              />
            </div>
            <div>
              <Label htmlFor="endsAt" className="text-xs">
                Ends
              </Label>
              <Input
                id="endsAt"
                name="endsAt"
                type="datetime-local"
                defaultValue={shift?.endsAt ?? ""}
                required
              />
            </div>
            <FieldHint>Use custom times only for special occasions outside standard slots.</FieldHint>
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          name="location"
          defaultValue={shift?.location ?? ""}
          placeholder="e.g. Trustees Theater, 216 E Broughton St"
          maxLength={160}
        />
      </div>

      <div>
        <Label htmlFor="description">Description (what volunteers will do)</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={shift?.description ?? ""}
          maxLength={1000}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="ownerId">Board member in charge (optional)</Label>
          <Select id="ownerId" name="ownerId" defaultValue={shift?.ownerId ?? ""}>
            <option value="">— None (managed by you) —</option>
            {boardMembers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
          <FieldHint>They&apos;ll see this shift on their board dashboard and get cancel alerts.</FieldHint>
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 text-sm font-semibold text-ink">
            <input
              type="checkbox"
              name="isPublished"
              defaultChecked={shift?.isPublished ?? true}
              className="h-4 w-4 accent-ted"
            />
            Visible to volunteers
          </label>
        </div>
      </div>

      {state.error ? <p className="text-sm font-semibold text-ted">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : shift?.id ? "Save changes" : "Create shift"}
      </Button>
    </form>
  );
}
