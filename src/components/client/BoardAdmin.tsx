"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addBoardMemberAction,
  removeBoardRole,
  resendBoardInvite,
  type FormState,
} from "@/lib/actions/admin-actions";
import { Button, Input, Label, FieldHint } from "@/components/primitives";

export function AddBoardForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState<FormState, FormData>(
    async (prev, fd) => {
      const r = await addBoardMemberAction(prev, fd);
      if (r.ok) router.refresh();
      return r;
    },
    {}
  );
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <div>
        <Label htmlFor="b-name">Name</Label>
        <Input id="b-name" name="name" placeholder="Board member's name" required maxLength={80} />
      </div>
      <div>
        <Label htmlFor="b-email">Email</Label>
        <Input id="b-email" name="email" type="email" placeholder="them@example.com" required />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Inviting…" : "Add & send invite"}
      </Button>
      <div className="sm:col-span-3">
        {state.error ? <p className="text-sm font-semibold text-ted">{state.error}</p> : null}
        {state.ok ? (
          <p className="text-sm font-semibold text-go">Invite sent ✓</p>
        ) : (
          <FieldHint>
            If the email belongs to an existing volunteer, they&apos;re promoted to board access
            instead.
          </FieldHint>
        )}
      </div>
    </form>
  );
}

export function BoardRowActions({ userId, name }: { userId: string; name: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex gap-1.5">
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => startTransition(async () => void (await resendBoardInvite(userId)))}
      >
        Resend invite
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (confirm(`Remove board access for ${name}? They stay in the system as a volunteer.`))
            startTransition(async () => {
              await removeBoardRole(userId);
              router.refresh();
            });
        }}
      >
        Remove access
      </Button>
    </div>
  );
}
