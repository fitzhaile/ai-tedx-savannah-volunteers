import { requireManager } from "@/lib/auth";
import type { ReactNode } from "react";

/** Navigation for the admin area lives in the sidebar (AppShell). */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireManager();
  return <>{children}</>;
}
