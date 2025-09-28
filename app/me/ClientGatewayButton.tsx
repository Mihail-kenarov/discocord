"use client";

import { useState } from 'react';
import { getGateway } from '@/app/apis/callsAPI';
import { Button } from '@/components/ui/button';

export function ClientGatewayButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setResult(null);
    setError(null);
    const { data, error } = await getGateway<string>('/');
    if (error) {
      setError(`${error.status ? error.status + ' ' : ''}${error.message}`);
    } else if (data) {
      setResult(typeof data === 'string' ? data : JSON.stringify(data));
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <Button onClick={handleClick} disabled={loading} variant="secondary" size="lg">
        {loading ? 'Calling Gateway…' : 'Call Gateway'}
      </Button>
      {result && (
        <pre className="text-xs bg-black/40 p-3 rounded-md max-w-xs whitespace-pre-wrap">{result}</pre>
      )}
      {error && <p className="text-xs text-rose-300">{error}</p>}
    </div>
  );
}
