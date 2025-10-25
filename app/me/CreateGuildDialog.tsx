"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Upload } from "lucide-react";

type CreateGuildDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateGuildDialog({ open, onOpenChange }: CreateGuildDialogProps) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [guildName, setGuildName] = React.useState("");
  const [iconPreview, setIconPreview] = React.useState<string | null>(null);

  const resetForm = React.useCallback(() => {
    setGuildName("");
    setIconPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  React.useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open, resetForm]);

  React.useEffect(() => {
    return () => {
      if (iconPreview) {
        URL.revokeObjectURL(iconPreview);
      }
    };
  }, [iconPreview]);

  const handleFileChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      setIconPreview(file ? URL.createObjectURL(file) : null);
    },
    []
  );

  const handleUploadClick = React.useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      // Integration with createGuild API will be wired up next.
      onOpenChange(false);
    },
    [onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border border-white/10 bg-[#101010] text-white shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">Create Your Server</DialogTitle>
          <DialogDescription className="text-sm text-neutral-400">
            Give your new server personality with a name and an icon. You can always tweak these later.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-8" onSubmit={handleSubmit}>
          <div className="flex flex-col items-center gap-6">
            <input
              ref={fileInputRef}
              id="create-server-icon"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={handleUploadClick}
              className="focus-visible:ring-ring/40 relative flex size-32 items-center justify-center rounded-full border-2 border-dashed border-neutral-600 bg-black/50 transition hover:border-emerald-400 hover:bg-emerald-400/10 focus-visible:outline-none focus-visible:ring-2"
            >
              {iconPreview ? (
                <span className="absolute inset-0 rounded-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={iconPreview}
                    alt="Server icon preview"
                    className="size-full rounded-full object-cover"
                  />
                </span>
              ) : (
                <span className="flex flex-col items-center gap-2 text-xs font-medium uppercase tracking-wide text-neutral-300">
                  <Upload className="size-5" />
                  Upload
                </span>
              )}
              <span className="absolute bottom-2 right-2 flex size-7 items-center justify-center rounded-full bg-emerald-500 text-black shadow-lg">
                <Plus className="size-4" />
              </span>
            </button>
            <div className="w-full space-y-3">
              <div className="space-y-1">
                <label htmlFor="create-server-name" className="text-sm font-semibold text-neutral-200">
                  Server Name <span className="text-red-400">*</span>
                </label>
                <Input
                  id="create-server-name"
                  value={guildName}
                  onChange={(event) => setGuildName(event.target.value)}
                  placeholder="Enter a server name"
                  className="border-neutral-700 bg-black/60 text-white placeholder:text-neutral-500 focus-visible:ring-emerald-500"
                  required
                />
              </div>
              <p className="text-xs text-neutral-500">
                By creating a server, you agree to follow our community guidelines.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              className="text-neutral-300 hover:text-white"
              onClick={() => onOpenChange(false)}
            >
              Back
            </Button>
            <Button
              type="submit"
              className="bg-emerald-500 text-black hover:bg-emerald-400 focus-visible:ring-emerald-500"
            >
              Create Server
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
