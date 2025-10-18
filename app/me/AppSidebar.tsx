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
import { Input } from "@/components/ui/input";
import { Camera, PenLine, Plus, Settings, Trash2 } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { useClerk, useUser } from "@clerk/nextjs";

type Guild = {
  id: string | number;
  name: string;
  iconUrl?: string | null;
  href?: string;
};

type AppSidebarUser = {
  name: string;
  imageUrl?: string | null;
  username?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

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
                <DropdownMenuItem onSelect={() => setIsProfileDialogOpen(true)}>
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

type ProfileDialogProps = {
  user: AppSidebarUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
};

function ProfileDialog({ user, open, onOpenChange, children }: ProfileDialogProps) {
  const editor = useProfileEditor(user, open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>User Profile</DialogTitle>
          <DialogDescription>View and manage your profile information.</DialogDescription>
        </DialogHeader>
        <ProfileDialogBody user={user} editor={editor} />
      </DialogContent>
    </Dialog>
  );
}

type ProfileDialogBodyProps = {
  user: AppSidebarUser;
  editor: ReturnType<typeof useProfileEditor>;
};

function ProfileDialogBody({ user, editor }: ProfileDialogBodyProps) {
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const [deleting, setDeleting] = React.useState(false);
  const [confirmText, setConfirmText] = React.useState("");
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const requiredPhrase = "Delete account";
  const isConfirmValid = confirmText.trim() === requiredPhrase;

  const emailFromClerk = clerkUser?.primaryEmailAddress?.emailAddress ?? user.email ?? "";

  async function handleDeleteAccount() {
    if (!clerkUser) return;
    try {
      setDeleting(true);
      await clerkUser.delete();
      await signOut({ redirectUrl: "/" });
    } finally {
      setDeleting(false);
    }
  }

  const {
    username,
    setUsername,
    isEditingUsername,
    beginEditUsername,
    saveUsername,
    isSavingUsername,
    hasUsernameChanges,
    canSaveUsername,
    usernameInputRef,
    normalizedFirstName,
    normalizedLastName,
  } = editor;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <Avatar className="size-20 border border-border shadow-sm">
            <AvatarImage src={user.imageUrl ?? undefined} alt={user.name} />
            <AvatarFallback className="text-xl">{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <button
            type="button"
            className="bg-background/80 text-muted-foreground hover:text-foreground absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full border shadow-sm backdrop-blur"
          >
            <Camera className="size-4" />
            <span className="sr-only">Update avatar</span>
          </button>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Display name</p>
          <p className="text-base font-medium">{user.name}</p>
        </div>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Username</p>
          <div className="relative flex items-center">
            <Input
              ref={usernameInputRef}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={!isEditingUsername}
              className={cn("pr-11 font-medium", !isEditingUsername && "cursor-not-allowed opacity-80")}
            />
            <button
              type="button"
              onClick={beginEditUsername}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition hover:bg-muted/70 hover:text-foreground"
              aria-label={isEditingUsername ? "Editing username" : "Edit username"}
            >
              <PenLine className="size-4" />
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Email</p>
          <Input
            value={emailFromClerk}
            disabled
            readOnly
            className="cursor-not-allowed opacity-80"
            placeholder="No email available"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">First name</p>
            <Input value={normalizedFirstName} disabled readOnly className="cursor-not-allowed opacity-80" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Last name</p>
            <Input value={normalizedLastName} disabled readOnly className="cursor-not-allowed opacity-80" />
          </div>
        </div>
      </div>
      {hasUsernameChanges && (
        <Button
          type="button"
          onClick={saveUsername}
          disabled={!canSaveUsername || isSavingUsername}
          className={cn(
            "w-full bg-emerald-500 text-white hover:bg-emerald-600",
            (!canSaveUsername || isSavingUsername) && "opacity-70 hover:bg-emerald-500"
          )}
        >
          {isSavingUsername ? "Saving..." : "Save Changes"}
        </Button>
      )}

      <Separator className="my-2" />

      <Button
        type="button"
        variant="destructive"
        className="w-full"
        onClick={() => setConfirmOpen(true)}
        disabled={!clerkUser || deleting}
      >
        <Trash2 className="size-4" />
        Delete Account
      </Button>

      <Dialog open={confirmOpen} onOpenChange={(v) => { setConfirmOpen(v); if (!v) setConfirmText(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              This action is permanent and cannot be undone. Your account and associated data will be deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Type '{requiredPhrase}' to confirm
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={requiredPhrase}
              aria-invalid={confirmText.length > 0 && !isConfirmValid}
              disabled={deleting}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={isConfirmValid ? "destructive" : "outline"}
              onClick={handleDeleteAccount}
              disabled={!isConfirmValid || deleting}
            >
              <Trash2 className="size-4" />
              {deleting ? "Deleting..." : "Delete Account"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function useProfileEditor(user: AppSidebarUser, isOpen: boolean) {
  const { user: clerkUser } = useUser();
  const fallbackUsername = React.useMemo(() => {
    if (user.username) return user.username;
    if (user.name) return user.name.replace(/\s+/g, "").toLowerCase();
    return "";
  }, [user.name, user.username]);

  const [initialUsername, setInitialUsername] = React.useState(fallbackUsername);
  const [username, setUsername] = React.useState(fallbackUsername);
  const [isEditingUsername, setIsEditingUsername] = React.useState(false);
  const usernameInputRef = React.useRef<HTMLInputElement>(null);
  const [isSavingUsername, setIsSavingUsername] = React.useState(false);

  React.useEffect(() => {
    setInitialUsername(fallbackUsername);
    setUsername(fallbackUsername);
    setIsEditingUsername(false);
  }, [fallbackUsername]);

  React.useEffect(() => {
    if (!isOpen) {
      setUsername((current) => (current !== initialUsername ? initialUsername : current));
      setIsEditingUsername(false);
    }
  }, [initialUsername, isOpen]);

  const beginEditUsername = React.useCallback(() => {
    setIsEditingUsername(true);
    requestAnimationFrame(() => {
      const input = usernameInputRef.current;
      if (!input) return;
      const length = input.value.length;
      input.focus();
      input.setSelectionRange(length, length);
    });
  }, []);

  const trimmedUsername = username.trim();
  const hasUsernameChanges = isEditingUsername && trimmedUsername !== initialUsername.trim();
  const canSaveUsername = hasUsernameChanges && trimmedUsername.length > 0;

  const saveUsername = React.useCallback(async () => {
    if (!trimmedUsername) return;
    try {
      setIsSavingUsername(true);
      if (clerkUser) {
        await clerkUser.update({ username: trimmedUsername });
      }
      setInitialUsername(trimmedUsername);
      setUsername(trimmedUsername);
      setIsEditingUsername(false);
    } finally {
      setIsSavingUsername(false);
    }
  }, [trimmedUsername, clerkUser]);

  const normalizedFirstName = React.useMemo(() => {
    if (user.firstName) return user.firstName;
    return user.name?.split(/\s+/)[0] ?? "";
  }, [user.firstName, user.name]);

  const normalizedLastName = React.useMemo(() => {
    if (user.lastName) return user.lastName;
    const parts = user.name?.split(/\s+/) ?? [];
    return parts.slice(1).join(" ");
  }, [user.lastName, user.name]);

  return {
    username,
    setUsername,
    isEditingUsername,
    beginEditUsername,
    saveUsername,
    isSavingUsername,
    hasUsernameChanges,
    canSaveUsername,
    usernameInputRef,
    normalizedFirstName,
    normalizedLastName,
  };
}
