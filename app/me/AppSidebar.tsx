"use client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Plus, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

type Guild = {
  id: string | number;
  name: string;
  iconUrl?: string | null;
  href?: string;
};

export function AppSidebar({
  guilds,
  user,
  className,
}: {
  guilds: Guild[];
  user: { name: string; imageUrl?: string | null };
  className?: string;
}) {
  return (
    <Sidebar collapsible="offcanvas" className={cn("border-r border-sidebar-border", className)}>
      <SidebarHeader>
        <SidebarGroupLabel className="text-sm">Home</SidebarGroupLabel>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs">Servers</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {guilds.map((g) => (
                <SidebarMenuItem key={g.id}>
                  <SidebarMenuButton asChild>
                    <a href={g.href ?? "#"} className="flex items-center gap-3">
                      <Avatar className="size-6">
                        <AvatarImage src={g.iconUrl ?? undefined} alt={g.name} />
                        <AvatarFallback>{getInitials(g.name)}</AvatarFallback>
                      </Avatar>
                      <span className="truncate">{g.name}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <button className="flex items-center gap-2">
                    <Plus className="size-4" />
                    <span>Add a Server</span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
        <div className="flex items-center justify-between gap-2 rounded-md bg-background/40 p-2">
          <div className="flex items-center gap-2">
            <Avatar className="size-8">
              <AvatarImage src={user.imageUrl ?? undefined} alt={user.name} />
              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">{user.name}</span>
            </div>
          </div>
          <Button size="icon" variant="outline" className="shrink-0">
            <Settings className="size-4" />
          </Button>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function getInitials(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts[1]?.[0] ?? "";
  return (first + last || first || "?").toUpperCase();
}

