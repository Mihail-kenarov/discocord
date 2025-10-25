"use client";
import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Camera, PenLine, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useUser } from "@clerk/nextjs";
import type { AppSidebarUser } from "./types";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { DeleteAccountDialog } from "./DeleteAccountDialog";

type ProfileDialogProps = {
  user: AppSidebarUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
};

export function ProfileDialog({ user, open, onOpenChange, children }: ProfileDialogProps) {
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
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const displayName = user.displayName ?? user.username;

  const emailFromClerk = clerkUser?.primaryEmailAddress?.emailAddress ?? user.email ?? "";

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
  } = editor;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <Avatar className="size-20 border border-border shadow-sm">
            <AvatarImage src={user.imageUrl ?? undefined} alt={displayName} />
            <AvatarFallback className="text-xl">
              {user.username?.charAt(0)?.toUpperCase() ?? "?"}
            </AvatarFallback>
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
          <p className="text-base font-medium">{displayName}</p>
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
        {/* Removed first/last name fields */}
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
        disabled={!clerkUser}
      >
        <Trash2 className="size-4" />
        Delete Account
      </Button>

      <DeleteAccountDialog open={confirmOpen} onOpenChange={setConfirmOpen} />
    </div>
  );
}

function useProfileEditor(user: AppSidebarUser, isOpen: boolean) {
  const { user: clerkUser } = useUser();
  const router = useRouter();
  const fallbackUsername = React.useMemo(() => user.username, [user.username]);

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
      toast("Username changed successfully");
      // Refresh server components so any server-fetched user info updates
      router.refresh();
    } finally {
      setIsSavingUsername(false);
    }
  }, [trimmedUsername, clerkUser, router]);

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
  };
}
