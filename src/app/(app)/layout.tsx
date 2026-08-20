import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import type { ReactNode } from "react";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  return <AppShell user={user}>{children}</AppShell>;
}
