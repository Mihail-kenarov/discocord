"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getGatewayUsers } from "@/app/apis/callsAPI";

export function ClientGatewayButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const { data, error } = await getGatewayUsers();
      if (error) throw new Error(`${error.status} ${error.message}`);
      setResult(JSON.stringify(data, null, 2));
    } catch (e: unknown) {
      setError((e as Error).message);
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