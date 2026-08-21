"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  sendMessageAction,
  previewAudienceAction,
  type SendMessageState,
} from "@/lib/actions/message-actions";
import { Button, Input, Label, Select, Textarea, FieldHint, Card } from "@/components/primitives";
import { cn } from "@/lib/cn";

export interface ComposerShiftOption {
  id: string;
  label: string;
}

type AudienceKind = "ALL_ACTIVE" | "CATEGORY" | "SHIFT" | "OWNED_ALL" | "USERS";

export function MessageComposer({
  shiftOptions,
  userOptions,
  kinds,
  initialShiftId,
  initialUserIds,
  doneHref,
}: {
  shiftOptions: ComposerShiftOption[];
  userOptions: { id: string; name: string }[] | null;
  kinds: { key: AudienceKind; label: string }[];
  initialShiftId?: string;
  initialUserIds?: string[];
  doneHref: string;
}) {
  const [kind, setKind] = useState<AudienceKind>(
    initialShiftId ? "SHIFT" : initialUserIds?.length ? "USERS" : kinds[0].key
  );
  const [shiftId, setShiftId] = useState(initialShiftId ?? shiftOptions[0]?.id ?? "");
  const [userIds, setUserIds] = useState<string[]>(initialUserIds ?? []);
  const [preview, setPreview] = useState<{ count: number; names: string[] } | null>(null);
  const [state, action, pending] = useActionState<SendMessageState, FormData>(
    sendMessageAction,
    {}
  );

  const spec = useMemo(() => {
    switch (kind) {
      case "ALL_ACTIVE":
        return JSON.stringify({ type: "ALL_ACTIVE" });
      case "CATEGORY":
        return JSON.stringify({ type: "CATEGORY", category: "COACHING" });
      case "SHIFT":
        return JSON.stringify({ type: "SHIFT", shiftId });
      case "OWNED_ALL":
        return JSON.stringify({ type: "OWNED_ALL" });
      case "USERS":
        return JSON.stringify({ type: "USERS", userIds });
    }
  }, [kind, shiftId, userIds]);

  useEffect(() => {
    let cancelled = false;
    setPreview(null);
    previewAudienceAction(spec).then((p) => {
      if (!cancelled) setPreview(p);
    });
    return () => {
      cancelled = true;
    };
  }, [spec]);

  if (state.sentTo !== undefined) {
    return (
      <Card>
        <p className="text-lg font-extrabold text-ink">Sent ✓</p>
        <p className="mt-1 text-sm text-ink-soft">
          Your message went to {state.sentTo} {state.sentTo === 1 ? "person" : "people"} (
          {state.audienceLabel}).
          {state.deferred ? (
            <>
              {" "}
              <span className="font-semibold text-warn">
                {state.deferred} more are queued
              </span>{" "}
              and go out on the next scheduler run — today&apos;s email budget was reached.
            </>
          ) : null}
        </p>
        <p className="mt-1 text-sm text-ink-soft">Replies land in your regular email inbox.</p>
        <div className="mt-4">
          <Link href={doneHref} className="text-sm font-bold text-ted hover:underline">
            ← Done
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="spec" value={spec} />

      <div>
        <Label>Who gets this?</Label>
        <div className="flex flex-wrap gap-2">
          {kinds.map((k) => (
            <button
              key={k.key}
              type="button"
              onClick={() => setKind(k.key)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-bold",
                kind === k.key
                  ? "border-ted bg-ted-soft text-ted-dark"
                  : "border-line bg-card text-ink-soft hover:border-ink-faint"
              )}
            >
              {k.label}
            </button>
          ))}
        </div>
      </div>

      {kind === "SHIFT" ? (
        <div>
          <Label htmlFor="m-shift">Which shift?</Label>
          <Select id="m-shift" value={shiftId} onChange={(e) => setShiftId(e.target.value)}>
            {shiftOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      {kind === "USERS" && userOptions ? (
        <div>
          <Label>Pick people</Label>
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-line bg-card p-3">
            {userOptions.map((u) => (
              <label key={u.id} className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-ted"
                  checked={userIds.includes(u.id)}
                  onChange={(e) =>
                    setUserIds((prev) =>
                      e.target.checked ? [...prev, u.id] : prev.filter((x) => x !== u.id)
                    )
                  }
                />
                {u.name}
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-lg bg-line/40 px-3.5 py-2.5 text-sm text-ink-soft">
        {preview === null ? (
          "Counting recipients…"
        ) : preview.count === 0 ? (
          <span className="font-semibold text-warn">Nobody matches this audience yet.</span>
        ) : (
          <>
            <span className="font-bold text-ink">{preview.count}</span>{" "}
            {preview.count === 1 ? "person" : "people"}: {preview.names.join(", ")}
            {preview.count > preview.names.length ? "…" : ""}
          </>
        )}
      </div>

      <div>
        <Label htmlFor="m-subject">Subject</Label>
        <Input id="m-subject" name="subject" required maxLength={150} placeholder="e.g. Parking info for Saturday" />
      </div>
      <div>
        <Label htmlFor="m-body">Message</Label>
        <Textarea id="m-body" name="body" required maxLength={5000} className="min-h-40" placeholder="Write it like a normal email — volunteers can just hit reply." />
        <FieldHint>
          Every email includes a sign-in button to the app, and replies go to your real inbox.
        </FieldHint>
      </div>

      {state.error ? <p className="text-sm font-semibold text-ted">{state.error}</p> : null}
      <Button type="submit" disabled={pending || preview?.count === 0}>
        {pending ? "Sending…" : `Send to ${preview?.count ?? "…"} ${preview?.count === 1 ? "person" : "people"}`}
      </Button>
    </form>
  );
}
