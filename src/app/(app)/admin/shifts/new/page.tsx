import { Card, PageHeader } from "@/components/ui";
import { ShiftForm } from "@/components/client/ShiftForm";
import { getSlotOptions, getBoardOptions } from "@/lib/queries/admin";

export const metadata = { title: "New shift · Admin" };
export const dynamic = "force-dynamic";

export default async function NewShiftPage() {
  const [slots, boardMembers] = await Promise.all([getSlotOptions(), getBoardOptions()]);
  return (
    <div className="max-w-2xl">
      <PageHeader title="New shift" subtitle="Volunteers see it as soon as it's published." />
      <Card>
        <ShiftForm slots={slots} boardMembers={boardMembers} />
      </Card>
    </div>
  );
}
