"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateVolunteerAction,
  setUserActive,
  generateSigninLink,
  type FormState,
} from "@/lib/actions/admin-actions";
import { Button, Input, Label, Textarea, FieldHint } from "@/components/primitives";

export function VolunteerEditForm({
  user,
}: {
  user: { id: string; name: string; email: string; phone: string | null; adminNotes: string | null };
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateVolunteerAction, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={user.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="v-name">Name</Label>
          <Input id="v-name" name="name" defaultValue={user.name} required maxLength={80} />
        </div>
        <div>
          <Label htmlFor="v-phone">Phone</Label>
          <Input id="v-phone" name="phone" defaultValue={user.phone ?? ""} maxLength={30} />
        </div>
      </div>
      <div>
        <Label htmlFor="v-email">Email</Label>
        <Input id="v-email" name="email" type="email" defaultValue={user.email} required />
        <FieldHint>Changing this changes where their sign-in links and shift emails go.</FieldHint>
      </div>
      <div>
        <Label htmlFor="v-notes">Private notes (only you see these)</Label>
        <Textarea
          id="v-notes"
          name="adminNotes"
          defaultValue={user.adminNotes ?? ""}
          placeholder="e.g. Great with tech. Prefers morning shifts. Friend of Sarah's."
          maxLength={2000}
        />
      </div>
      {state.error ? <p className="text-sm font-semibold text-ted">{state.error}</p> : null}
      <div className="flex items-center gap-3">
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        {state.ok ? <span className="text-sm font-semibold text-go">Saved ✓</span> : null}
      </div>
    </form>
  );
}

export function VolunteerTools({
  userId,
  name,
  isActive,
  isSelf,
}: {
  userId: string;
  name: string;
  isActive: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div>
        <Button
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const url = await generateSigninLink(userId);
              setLink(url);
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2500);
              } catch {
                // clipboard blocked — the link is shown below instead
              }
            })
          }
        >
          {copied ? "Copied ✓" : "Copy sign-in link"}
        </Button>
        <FieldHint>
          A 14-day one-tap sign-in link for {name} — handy when someone says they can&apos;t log
          in (text it to them), or for testing as this person.
        </FieldHint>
        {link ? (
          <p className="mt-1 rounded-md bg-muted p-2 font-mono text-[10px] break-all text-muted-foreground">
            {link}
          </p>
        ) : null}
      </div>

      {!isSelf ? (
        <div>
          <Button
            variant={isActive ? "danger" : "primary"}
            size="sm"
            disabled={pending}
            onClick={() => {
              const msg = isActive
                ? `Deactivate ${name}? They'll be signed out everywhere and can't sign in or take shifts. Their existing signups stay on rosters until you remove them.`
                : `Reactivate ${name}?`;
              if (confirm(msg))
                startTransition(async () => {
                  await setUserActive(userId, !isActive);
                  router.refresh();
                });
            }}
          >
            {isActive ? "Deactivate account" : "Reactivate account"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
