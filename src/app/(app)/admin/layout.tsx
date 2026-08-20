import { requireManager } from "@/lib/auth";
import { SubNav } from "@/components/client/SubNav";
import type { ReactNode } from "react";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireManager();
  const links = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/shifts", label: "Shifts" },
    { href: "/admin/slots", label: "Standard times" },
    { href: "/admin/volunteers", label: "Volunteers" },
    { href: "/admin/board", label: "Board" },
    { href: "/admin/messages", label: "Messages" },
    { href: "/admin/checkin", label: "Check-in" },
  ];
  if (process.env.ENABLE_TIME_TRAVEL === "true") {
    links.push({ href: "/admin/dev", label: "⏱ Time travel" });
  }
  return (
    <div>
      <SubNav links={links} />
      {children}
    </div>
  );
}
