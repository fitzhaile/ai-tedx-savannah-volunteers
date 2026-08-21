import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/clock";
import { Card, PageHeader } from "@/components/primitives";
import { ThreadPanel } from "@/components/client/ThreadPanel";
import { getThread } from "@/lib/queries/threads";

export const metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const user = await requireUser();
  if (user.role === "MANAGER") redirect("/admin/volunteers");

  const [thread, settings] = await Promise.all([getThread(user.id), getSettings()]);

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Messages"
        subtitle="Your direct line to the volunteer manager."
      />
      <Card>
        <ThreadPanel
          viewer="member"
          threadUserId={user.id}
          counterpartName={settings.fromName || "the team"}
          messages={thread}
        />
      </Card>
      <p className="mt-3 text-xs text-ink-soft">
        Prefer email? Just reply to any email from us — it shows up here too.
      </p>
    </div>
  );
}
