"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CalendarCheck,
  MessageSquare,
  Users,
  LayoutDashboard,
  Clock,
  UserRound,
  Shield,
  Mail,
  ClipboardCheck,
  Timer,
  type LucideIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Wordmark } from "@/components/primitives";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: number;
  exact?: boolean;
}
export interface NavGroup {
  label: string;
  items: NavItem[];
}

const ICONS: Record<string, LucideIcon> = {
  calendar: CalendarDays,
  mine: CalendarCheck,
  messages: MessageSquare,
  users: Users,
  dashboard: LayoutDashboard,
  slots: Clock,
  volunteer: UserRound,
  board: Shield,
  mail: Mail,
  checkin: ClipboardCheck,
  timer: Timer,
};

export function AppSidebar({ groups, footer }: { groups: NavGroup[]; footer: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="px-4 py-4 pr-6">
        <Link href="/">
          <Wordmark inverse />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel className="text-white/50">{g.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => {
                  const Icon = ICONS[item.icon] ?? CalendarDays;
                  const active = item.exact
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        className="data-[active=true]:bg-sidebar-accent data-[active=true]:text-white data-[active=true]:shadow-[inset_3px_0_0_0_var(--color-ted)]"
                      >
                        <Link href={item.href}>
                          <Icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                      {item.badge ? (
                        <SidebarMenuBadge className="bg-ted text-white">{item.badge}</SidebarMenuBadge>
                      ) : null}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border px-4 py-3">{footer}</SidebarFooter>
    </Sidebar>
  );
}
