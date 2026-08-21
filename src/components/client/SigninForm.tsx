"use client";

import { useActionState } from "react";
import { signinAction, type AuthFormState } from "@/lib/actions/auth-actions";
import { Button, Input, Label } from "@/components/primitives";

export function SigninForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signinAction, {});

  if (state.sent) {
    return (
      <div className="rounded-xl bg-go-soft p-4 text-sm text-ink">
        <p className="font-bold">Check your email 📬</p>
        <p className="mt-1 text-ink-soft">
          If that address is registered, a sign-in link is on its way. It works for 15
          minutes.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="you@example.com" required autoFocus />
      </div>
      {state.error ? <p className="text-sm font-semibold text-ted">{state.error}</p> : null}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Email me a sign-in link"}
      </Button>
    </form>
  );
}
