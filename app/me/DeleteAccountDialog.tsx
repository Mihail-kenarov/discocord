"use client";
import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";
import { useClerk, useUser } from "@clerk/nextjs";

type DeleteAccountDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DeleteAccountDialog({ open, onOpenChange }: DeleteAccountDialogProps) {
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const [confirmText, setConfirmText] = React.useState("");
  const [deleting, setDeleting] = React.useState(false);
  const requiredPhrase = "Delete account";
  const isConfirmValid = confirmText.trim() === requiredPhrase;

  React.useEffect(() => {
    if (!open) setConfirmText("");
  }, [open]);

  async function handleDeleteAccount() {
    if (!clerkUser || !isConfirmValid) return;
    try {
      setDeleting(true);
      await clerkUser.delete();
      await signOut({ redirectUrl: "/" });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Account</DialogTitle>
          <DialogDescription>
            This action is permanent and cannot be undone. Your account and associated data will be deleted.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Type &apos;{requiredPhrase}&apos; to confirm
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
            onClick={() => onOpenChange(false)}
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
  );
}
