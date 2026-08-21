"use client";

import { useActionState } from "react";
import { joinAction, type AuthFormState } from "@/lib/actions/auth-actions";
import { Button, Input, Label, FieldHint } from "@/components/primitives";

export function JoinForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(joinAction, {});

  if (state.sent) {
    return (
      <div className="rounded-xl bg-go-soft p-4 text-sm text-ink">
        <p className="font-bold">Welcome back — check your email!</p>
        <p className="mt-1 text-ink-soft">
          That address is already registered, so we sent you a sign-in link instead.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="name">Your name</Label>
        <Input id="name" name="name" placeholder="First and last name" required maxLength={80} />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="you@example.com" required />
        <FieldHint>We&apos;ll use this to sign you in — no password needed.</FieldHint>
      </div>
      <div>
        <Label htmlFor="phone">Phone (optional)</Label>
        <Input id="phone" name="phone" type="tel" placeholder="912-555-0123" maxLength={30} />
        <FieldHint>Only used by the volunteer team for day-of coordination.</FieldHint>
      </div>
      {state.error ? <p className="text-sm font-semibold text-ted">{state.error}</p> : null}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Creating your account…" : "Join the volunteer crew"}
      </Button>
    </form>
  );
}
