"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ClientGatewayButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/gw/"); // now hits rewrite → gateway
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const text = await res.text();
      setResult(text);
    } catch (e: any | unknown) {
      setError(e.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <Button onClick={handleClick} disabled={loading} variant="secondary">
        {loading ? "Calling Gateway..." : "Call Gateway"}
      </Button>
      {result && (
        <pre className="text-xs bg-black/30 px-3 py-2 rounded max-w-xs overflow-x-auto">
          {result}
        </pre>
      )}
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}