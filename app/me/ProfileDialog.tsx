"use client";
import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Camera, Download, Loader2, PenLine, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useUser } from "@clerk/nextjs";
import type { AppSidebarUser } from "./displayDataModels";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { DeleteAccountDialog } from "./DeleteAccountDialog";
import { PersonalDataDialog } from "./PersonalDataDialog";
import { getUserPersonalData, type PersonalDataBundle } from "@/app/api/callsAPI";

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
  const [personalDataOpen, setPersonalDataOpen] = React.useState(false);
  const [personalData, setPersonalData] = React.useState<PersonalDataBundle | null>(null);
  const [personalDataError, setPersonalDataError] = React.useState<string | null>(null);
  const [isFetchingPersonalData, setIsFetchingPersonalData] = React.useState(false);
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

  const handleRequestPersonalData = React.useCallback(async () => {
    if (!user.id) return;
    setPersonalDataOpen(true);
    setIsFetchingPersonalData(true);
    setPersonalData(null);
    setPersonalDataError(null);
    const { data, error } = await getUserPersonalData(user.id);
    if (data) {
      setPersonalData(data);
    }
    if (error) {
      const message = error.message || "Unable to retrieve personal data";
      setPersonalDataError(message);
      if (!data) {
        toast.error(message);
      } else {
        toast("Personal data ready with some warnings");
      }
    } else if (data) {
      toast("Personal data ready");
    } else {
      toast.error("No personal data available");
    }
    setIsFetchingPersonalData(false);
  }, [user.id]);

  return (
    <>
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
                data-cy="profile-username-input"
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
                data-cy="edit-username"
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
            data-cy="profile-save-username"
          >
            {isSavingUsername ? "Saving..." : "Save Changes"}
          </Button>
        )}

        <Button
          type="button"
          variant="outline"
          className="w-full justify-center gap-2"
          onClick={handleRequestPersonalData}
          disabled={isFetchingPersonalData}
          data-cy="personal-data-button"
        >
          {isFetchingPersonalData ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Preparing data...
            </>
          ) : (
            <>
              <Download className="size-4" />
              View my data
            </>
          )}
        </Button>

        <Separator className="my-2" />

        <Button
          type="button"
          variant="destructive"
          className="w-full"
          onClick={() => setConfirmOpen(true)}
          disabled={!clerkUser}
          data-cy="delete-account-button"
        >
          <Trash2 className="size-4" />
          Delete Account
        </Button>

        <DeleteAccountDialog open={confirmOpen} onOpenChange={setConfirmOpen} />
      </div>

      <PersonalDataDialog
        open={personalDataOpen}
        onOpenChange={setPersonalDataOpen}
        data={personalData}
        isLoading={isFetchingPersonalData}
        error={personalDataError}
        onRetry={handleRequestPersonalData}
      />
    </>
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
