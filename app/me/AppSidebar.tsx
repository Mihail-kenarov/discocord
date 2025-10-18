"use client";
import * as React from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [showProfileDialog, setShowProfileDialog] = React.useState(false);

  return (
    <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="outline" className="shrink-0">
                  <Settings className="size-4" />
                  <span className="sr-only">Open user menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onSelect={() => setShowProfileDialog(true)}>
                  View profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive">
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Profile</DialogTitle>
          <DialogDescription>Details about your account.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar className="size-16">
            <AvatarImage src={user.imageUrl ?? undefined} alt={user.name} />
            <AvatarFallback className="text-xl">{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Display name</p>
              <p className="text-base font-medium">{user.name}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getInitials(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts[1]?.[0] ?? "";
  return (first + last || first || "?").toUpperCase();
}
