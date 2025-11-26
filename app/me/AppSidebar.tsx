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
import { Home, Plus, Settings } from "lucide-react";
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
import type { Guild, AppSidebarUser } from "./displayDataModels";
import { CreateGuildDialog } from "./CreateGuildDialog";

type AppSidebarProps = {
  guilds: Guild[];
  user: AppSidebarUser;
  className?: string;
  activeGuildId: Guild["id"] | null;
  onSelectHome: () => void;
  onSelectGuild: (id: Guild["id"]) => void;
  onGuildCreated?: (guild: Guild) => void;
};


export function AppSidebar({
  guilds,
  user,
  className,
  activeGuildId,
  onSelectHome,
  onSelectGuild,
  onGuildCreated,
}: AppSidebarProps) {
  const [isProfileDialogOpen, setIsProfileDialogOpen] = React.useState(false);
  const [isCreateGuildDialogOpen, setIsCreateGuildDialogOpen] = React.useState(false);
  const { signOut } = useClerk();
  const handleSignOut = React.useCallback(async () => {
    await signOut({ redirectUrl: "/" });
  }, [signOut]);

  const isHomeActive = activeGuildId == null;
  const displayName = user.displayName ?? user.username;

  return (
    <>
      <CreateGuildDialog
        open={isCreateGuildDialogOpen}
        onOpenChange={setIsCreateGuildDialogOpen}
        ownerId={user.id}
        onGuildCreated={onGuildCreated}
      />
      <ProfileDialog
        user={user}
        open={isProfileDialogOpen}
        onOpenChange={setIsProfileDialogOpen}
      >
        <Sidebar collapsible="offcanvas" className={cn("border-r border-sidebar-border", className)}>
          <SidebarHeader>
            <Button
              variant="ghost"
              type="button"
              onClick={onSelectHome}
              className={cn(
                "mt-2 w-full justify-start gap-2 rounded-lg border border-white/10 bg-black text-white transition hover:bg-neutral-900",
                isHomeActive && "border-emerald-500/40 bg-neutral-950 shadow-[0_0_0_1px_rgba(16,185,129,0.45)]"
              )}
              aria-pressed={isHomeActive}
            >
              <Home className="size-4" />
              <span>Home</span>
            </Button>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs">Servers</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {guilds.map((g) => (
                    <SidebarMenuItem key={g.id}>
                      <SidebarMenuButton
                        type="button"
                        onClick={() => onSelectGuild(g.id)}
                        isActive={activeGuildId === g.id}
                        className="h-14 items-center gap-4 p-2"
                      >
                        <Avatar className="size-12 border border-white/10">
                          <AvatarImage className="object-cover object-center" src={g.iconUrl ?? undefined} alt={g.name} />
                          <AvatarFallback className="text-base font-semibold">
                            {g.name?.charAt(0)?.toUpperCase() ?? "#"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate text-sm">{g.name}</span>
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
                    <SidebarMenuButton
                      data-cy="create-server-button"
                      type="button"
                      onClick={() => setIsCreateGuildDialogOpen(true)}
                      className="justify-start gap-2 bg-emerald-500 text-black transition hover:bg-emerald-400 focus-visible:ring-emerald-500"
                    >
                      <Plus className="size-4" />
                      <span>Create Server</span>
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
                  <AvatarImage src={user.imageUrl ?? undefined} alt={displayName} />
                  <AvatarFallback>{user.username?.charAt(0)?.toUpperCase() ?? "?"}</AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">{displayName}</span>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="outline" className="shrink-0" data-cy="user-menu-trigger">
                    <Settings className="size-4" />
                    <span className="sr-only">Open user menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onSelect={() => setIsProfileDialogOpen(true)} data-cy="view-profile-item">
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
    </>
  );
}
