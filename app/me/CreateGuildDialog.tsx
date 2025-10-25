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
import { createGuild, type ApiError } from "@/app/api/callsAPI";
import type { Guild } from "./types";
import { toast } from "sonner";

type CreateGuildDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerId: string;
  onGuildCreated?: (guild: Guild) => void;
};

export function CreateGuildDialog({ open, onOpenChange, ownerId, onGuildCreated }: CreateGuildDialogProps) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [guildName, setGuildName] = React.useState("");
  const [iconPreview, setIconPreview] = React.useState<string | null>(null);
  const [iconFile, setIconFile] = React.useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const resetForm = React.useCallback(() => {
    setGuildName("");
    setIconPreview(null);
    setIconFile(null);
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
      setIconPreview((current) => {
        if (current) URL.revokeObjectURL(current);
        return file ? URL.createObjectURL(file) : null;
      });
      setIconFile(file ?? null);
    },
    []
  );

  const handleUploadClick = React.useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (isSubmitting) return;
      const trimmedName = guildName.trim();
      if (!trimmedName) {
        toast.error("Server name is required.");
        return;
      }

      setIsSubmitting(true);
      try {
        let iconUrl: string | null = null;
        if (iconFile) {
          iconUrl = await fileToBase64(iconFile);
        }
        const guild = await createGuild({
          name: trimmedName,
          ownerId,
          iconUrl,
        });
        toast.success(`Created ${guild.name}`);
        onGuildCreated?.(guild);
        resetForm();
        onOpenChange(false);
      } catch (error) {
        const apiError = error as ApiError;
        toast.error(apiError.message || "Failed to create server");
      } finally {
        setIsSubmitting(false);
      }
    },
    [guildName, iconFile, isSubmitting, onGuildCreated, onOpenChange, ownerId, resetForm]
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
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Server"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
