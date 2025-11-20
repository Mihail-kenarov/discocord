"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Download, Loader2 } from "lucide-react";
import type { PersonalDataBundle, PersonalDataSnapshot } from "@/app/api/callsAPI";

export type PersonalDataDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: PersonalDataBundle | null;
  error: string | null;
  isLoading: boolean;
  onRetry: () => void;
};

export function PersonalDataDialog({ open, onOpenChange, data, error, isLoading, onRetry }: PersonalDataDialogProps) {
  const sources = React.useMemo(() => Object.entries(data?.sources ?? {}), [data]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[82vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Personal Data Export</DialogTitle>
          <DialogDescription>Snapshot of the information stored across DiscoCord services.</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex flex-col items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            Preparing your export...
          </div>
        ) : data ? (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/40 p-3 text-sm shadow-sm">
              <div className="grid gap-1 sm:grid-cols-2">
                <p className="truncate">
                  <span className="text-muted-foreground">User ID: </span>
                  <span className="font-medium">{data.userId}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Requested at: </span>
                  <span className="font-medium">{formatRequestedAt(data.requestedAt)}</span>
                </p>
              </div>
            </div>
            {error ? (
              <p className="rounded-md border border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {error}
              </p>
            ) : null}
            {sources.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data sources responded.</p>
            ) : (
              <ScrollArea className="max-h-[52vh] rounded-md border bg-background/60">
                <div className="space-y-3 p-3">
                  {sources.map(([service, snapshot]) => (
                    <PersonalDataSourceCard key={service} name={service} snapshot={snapshot} />
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        ) : (
          <div className="space-y-3 py-6 text-sm">
            <p className="text-muted-foreground">
              {error ?? "No personal data is currently available for your account."}
            </p>
            <Button variant="outline" className="justify-center gap-2" onClick={onRetry}>
              <Download className="size-4" />
              Try again
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PersonalDataSourceCard({ name, snapshot }: { name: string; snapshot: PersonalDataSnapshot }) {
  const normalizedStatus = snapshot.status?.toLowerCase?.() ?? "unknown";
  const statusClasses = getStatusClasses(normalizedStatus);
  const dataDisplay = snapshot.data ? formatSnapshotData(snapshot.data) : null;

  return (
    <div className="space-y-2 rounded-lg border bg-muted/30 p-3 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="font-semibold">{formatServiceName(name)}</p>
          {snapshot.error && <p className="text-sm text-destructive">{snapshot.error}</p>}
        </div>
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold capitalize", statusClasses)}>
          {snapshot.status ?? "unknown"}
        </span>
      </div>
      {dataDisplay ? (
        <div className="max-w-full overflow-x-auto rounded-md bg-black/40">
          <pre className="w-full min-w-max whitespace-pre p-3 text-xs leading-5">
            {dataDisplay}
          </pre>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No data returned from this service.</p>
      )}
    </div>
  );
}

function getStatusClasses(status: string) {
  switch (status) {
    case "ok":
      return "bg-emerald-100 text-emerald-700";
    case "pending":
      return "bg-blue-100 text-blue-700";
    case "timeout":
      return "bg-amber-100 text-amber-700";
    case "error":
      return "bg-red-100 text-red-700";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function formatSnapshotData(data: unknown): string {
  if (typeof data === "string") {
    const trimmed = data.trim();
    if (!trimmed) return "";
    try {
      return JSON.stringify(JSON.parse(trimmed), null, 2);
    } catch {
      return trimmed;
    }
  }
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

function formatRequestedAt(value: string) {
  const date = new Date(value);
  return isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatServiceName(raw: string) {
  const normalized = raw.toLowerCase();
  if (normalized === "chat") return "Chat data";
  if (normalized === "guild") return "Guild data";
  if (normalized === "user service" || normalized === "user_service") return "User data";
  const cleaned = raw.replace(/_/g, " ").trim();
  return cleaned.slice(0, 1).toUpperCase() + cleaned.slice(1);
}
