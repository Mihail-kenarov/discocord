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
import { ProfileDialog } from "./ProfileDialog";
import { useClerk } from "@clerk/nextjs";
import type { Guild, AppSidebarUser } from "./types";

type AppSidebarProps = {
  guilds: Guild[];
  user: AppSidebarUser;
  className?: string;
};

export function AppSidebar({
  guilds,
  user,
  className,
}: AppSidebarProps) {
  const [isProfileDialogOpen, setIsProfileDialogOpen] = React.useState(false);
  const { signOut } = useClerk();
  const handleSignOut = React.useCallback(async () => {
    await signOut({ redirectUrl: "/" });
  }, [signOut]);

  return (
    <ProfileDialog
      user={user}
      open={isProfileDialogOpen}
      onOpenChange={setIsProfileDialogOpen}
    >
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
                <AvatarImage src={user.imageUrl ?? undefined} alt={user.username ?? user.name} />
                <AvatarFallback>{user.username ?? getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">{user.username ?? user.name}</span>
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
                <DropdownMenuItem onSelect={() => setIsProfileDialogOpen(true)}>
                  View profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    void handleSignOut();
                  }}
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive"
                >
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    </ProfileDialog>
  );
}


function getInitials(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts[1]?.[0] ?? "";
  return (first + last || first || "?").toUpperCase();
}

// Dialog logic moved to app/me/ProfileDialog.tsx
