"use client";

import * as React from "react";
import { toast } from "sonner";

type QueuedToast = {
  type: "success" | "info" | "warning" | "error";
  message: string;
};

const STORAGE_KEY = "globalToast";

export default function ToastListener() {
  React.useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      window.localStorage.removeItem(STORAGE_KEY);
      const data = JSON.parse(raw) as QueuedToast;
      if (!data?.message || !data?.type) return;
      switch (data.type) {
        case "success":
          toast.success(data.message);
          break;
        case "info":
          toast.info(data.message);
          break;
        case "warning":
          toast.warning(data.message);
          break;
        case "error":
          toast.error(data.message);
          break;
        default:
          break;
      }
    } catch {
      // no-op
    }
  }, []);

  return null;
}

