'use client';

import { useEffect, useState } from 'react';
import { Button, Card } from '@/components/ui';
import { Bookmark, BookmarkCheck } from 'lucide-react';

interface Resource { id: string; title: string; description?: string; topic?: string }

export default function ResourcesPage() {
  const [all, setAll] = useState<Resource[]>([]);
  const [saved, setSaved] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/proxy?path=/resources').then((r) => r.json()).then(setAll);
    fetch('/api/proxy?path=/saved-resources').then((r) => r.json()).then((data) => {
      setSaved(new Set(data.map((s: { resource_id: string }) => s.resource_id)));
    });
  }, []);

  async function toggle(id: string) {
    if (saved.has(id)) {
      await fetch(`/api/proxy?path=/saved-resources/${id}`, { method: 'DELETE' });
      setSaved((s) => { const n = new Set(s); n.delete(id); return n; });
    } else {
      await fetch(`/api/proxy?path=/saved-resources/${id}`, { method: 'POST' });
      setSaved((s) => new Set(s).add(id));
    }
  }

  const savedList = all.filter((r) => saved.has(r.id));

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-xl font-semibold mb-4">Mis recursos guardados</h2>
        {savedList.length === 0 ? (
          <p className="text-zinc-500">Aún no has guardado recursos.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {savedList.map((r) => (
              <Card key={r.id}>
                <h3 className="font-semibold">{r.title}</h3>
                <p className="text-sm text-zinc-400 mt-1">{r.description}</p>
              </Card>
            ))}
          </div>
        )}
      </section>
      <section>
        <h2 className="text-xl font-semibold mb-4">Catálogo</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {all.map((r) => (
            <Card key={r.id} className="flex justify-between items-start gap-4">
              <div>
                <h3 className="font-semibold">{r.title}</h3>
                <p className="text-xs text-brand-amber">{r.topic}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => toggle(r.id)}>
                {saved.has(r.id) ? <BookmarkCheck className="h-4 w-4 text-brand-amber" /> : <Bookmark className="h-4 w-4" />}
              </Button>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
