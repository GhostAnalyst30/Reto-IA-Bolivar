'use client';

import { useState } from 'react';
import { Button, Card, Input } from '@/components/ui';
import { Search } from 'lucide-react';

interface Result { id: string; title: string; description?: string; topic?: string; url?: string }

export default function SearchPage() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/proxy?path=/search', { method: 'POST', body: JSON.stringify({ q }) });
    setResults(await res.json());
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={search} className="flex gap-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar recursos educativos..." className="flex-1" />
        <Button type="submit" disabled={loading}><Search className="h-4 w-4" /></Button>
      </form>
      <div className="grid gap-4 md:grid-cols-2">
        {results.map((r) => (
          <Card key={r.id}>
            <h3 className="font-semibold">{r.title}</h3>
            {r.topic && <p className="text-xs text-brand-amber mt-1">{r.topic}</p>}
            <p className="text-sm text-zinc-400 mt-2">{r.description}</p>
          </Card>
        ))}
      </div>
      {results.length === 0 && q && !loading && <p className="text-zinc-500">Sin resultados para &quot;{q}&quot;</p>}
    </div>
  );
}
