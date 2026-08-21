"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatInTimeZone } from "date-fns-tz";
import { Badge, Button, Textarea } from "@/components/primitives";
import type { ThreadMessageView } from "@/lib/queries/threads";
import {
  sendThreadMessageAction,
  sendMemberThreadMessageAction,
  markThreadReadByManagerAction,
  markThreadReadByMemberAction,
} from "@/lib/actions/thread-actions";
import type { FormState } from "@/lib/actions/admin-actions";
import { TZ } from "@/lib/dates";

/**
 * The conversation view, used by both sides: the manager (on a member's
 * contact record) and the member (on /me/messages). Viewing marks the
 * viewer's side read via a POST server action.
 */
export function ThreadPanel({
  viewer,
  threadUserId,
  counterpartName,
  messages,
}: {
  viewer: "manager" | "member";
  threadUserId: string; // the member whose thread this is
  counterpartName: string; // shown in the empty state / placeholder
  messages: ThreadMessageView[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);
  const markedRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  const action = viewer === "manager" ? sendThreadMessageAction : sendMemberThreadMessageAction;
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});

  // Viewing the thread clears the viewer's unread flags (once per mount).
  useEffect(() => {
    if (markedRef.current) return;
    markedRef.current = true;
    startTransition(async () => {
      if (viewer === "manager") await markThreadReadByManagerAction(threadUserId);
      else await markThreadReadByMemberAction();
      router.refresh();
    });
  }, [viewer, threadUserId, router, startTransition]);

  // Keep the newest message in view.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  // After a successful send, clear the composer and refresh the list.
  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      toast.success("Message sent");
      router.refresh();
    }
  }, [state, router]);

  const mine = viewer === "manager" ? "FROM_TEAM" : "FROM_MEMBER";

  return (
    <div>
      {messages.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-soft">
          No messages yet — say hi to {counterpartName}!
        </p>
      ) : (
        <div ref={listRef} className="max-h-96 space-y-3 overflow-y-auto pr-1">
          {messages.map((m) => {
            const isMine = m.direction === mine;
            return (
              <div key={m.id} className={isMine ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 " +
                    (isMine
                      ? "rounded-br-sm bg-ted/10 text-ink"
                      : "rounded-bl-sm bg-line/50 text-ink")
                  }
                >
                  {m.subject ? (
                    <p className="text-xs font-bold text-ink">{m.subject}</p>
                  ) : null}
                  <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-[11px] text-ink-soft">
                    {m.authorName ? <span>{m.authorName}</span> : null}
                    <span>{formatInTimeZone(new Date(m.createdAtIso), TZ, "MMM d · h:mm a")}</span>
                    {m.source === "EMAIL" ? <Badge tone="neutral">via email</Badge> : null}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <form ref={formRef} action={formAction} className="mt-4 space-y-2">
        <input type="hidden" name="userId" value={threadUserId} />
        <Textarea
          name="body"
          rows={2}
          required
          placeholder={
            viewer === "manager" ? `Message ${counterpartName}…` : "Write to the volunteer manager…"
          }
        />
        {state.error ? <p className="text-sm font-semibold text-ted">{state.error}</p> : null}
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-ink-soft">
            {viewer === "manager"
              ? "They'll get this by email too — replies land right here."
              : "Goes straight to the volunteer manager."}
          </p>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Sending…" : "Send"}
          </Button>
        </div>
      </form>
    </div>
  );
}
