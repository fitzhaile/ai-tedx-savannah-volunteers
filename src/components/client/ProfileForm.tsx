"use client";

import { useActionState } from "react";
import { updateProfileAction, type AuthFormState } from "@/lib/actions/auth-actions";
import { Button, Input, Label, FieldHint } from "@/components/primitives";

export function ProfileForm({
  name,
  phone,
  email,
}: {
  name: string;
  phone: string | null;
  email: string;
}) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    updateProfileAction,
    {}
  );

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="p-name">First and last name</Label>
        <Input id="p-name" name="name" defaultValue={name} required maxLength={80} />
      </div>
      <div>
        <Label htmlFor="p-phone">Mobile phone</Label>
        <Input id="p-phone" name="phone" type="tel" defaultValue={phone ?? ""} required maxLength={30} />
      </div>
      <div>
        <Label>Email</Label>
        <p className="text-sm text-muted-foreground">{email}</p>
        <FieldHint>
          Need to change your email? Reply to any of our emails and we&apos;ll update it.
        </FieldHint>
      </div>
      {state.error ? <p className="text-sm font-semibold text-ted">{state.error}</p> : null}
      <div className="flex items-center gap-3">
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
        {state.sent ? <span className="text-sm font-semibold text-go">Saved ✓</span> : null}
      </div>
    </form>
  );
}
