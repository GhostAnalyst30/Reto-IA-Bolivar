'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Input } from '@/components/ui';
import { Bookmark, BookmarkCheck, Play, ExternalLink, Search } from 'lucide-react';
import { proxyJson } from '@/lib/proxy';

interface Resource {
  id: string;
  title: string;
  description?: string;
  topic?: string;
  url?: string;
  resource_type?: string;
  category?: string;
}

type Tab = 'videos' | 'links' | 'search';

export default function ResourcesPage() {
  const [tab, setTab] = useState<Tab>('videos');
  const [resources, setResources] = useState<Resource[]>([]);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<Resource[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    loadResources();
    proxyJson<{ resource_id: string }[]>('/saved-resources')
      .then((d) => setSaved(new Set((Array.isArray(d) ? d : []).map((s) => s.resource_id))))
      .catch(() => {});
  }, [tab]);

  async function loadResources() {
    try {
      const type = tab === 'videos' ? 'youtube' : tab === 'links' ? 'link' : undefined;
      const qs = type ? `?type=${type}` : '';
      const data = await proxyJson<Resource[]>(`/resources${qs}`);
      setResources(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  }

  async function doSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQ.trim()) return;
    const data = await proxyJson<Resource[]>('/search', {
      method: 'POST',
      body: JSON.stringify({ q: searchQ }),
    });
    setSearchResults(Array.isArray(data) ? data : []);
  }

  async function toggle(id: string) {
    if (saved.has(id)) {
      await proxyJson(`/saved-resources/${id}`, { method: 'DELETE' });
      setSaved((s) => { const n = new Set(s); n.delete(id); return n; });
    } else {
      await proxyJson(`/saved-resources/${id}`, { method: 'POST', body: '{}' });
      setSaved((s) => new Set(s).add(id));
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'videos', label: 'Videos YouTube' },
    { id: 'links', label: 'Repositorio de links' },
    { id: 'search', label: 'Buscador' },
  ];

  const displayList = tab === 'search' ? searchResults : resources;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Recursos y apoyo UTB</h1>
        <p className="text-zinc-500">Videos, enlaces institucionales y buscador de recursos</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-brand-border pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-brand-amber/20 text-brand-amber' : 'text-zinc-500 hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'search' && (
        <form onSubmit={doSearch} className="flex gap-2">
          <Input value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Buscar recursos..." className="flex-1" />
          <Button type="submit"><Search className="h-4 w-4" /></Button>
        </form>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {tab === 'videos' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayList.map((r) => (
            <Card key={r.id} className="overflow-hidden">
              <div className="aspect-video bg-brand-blue/20 flex items-center justify-center">
                <Play className="h-10 w-10 text-brand-amber" />
              </div>
              <div className="p-4">
                <h3 className="font-semibold">{r.title}</h3>
                <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{r.description}</p>
                <div className="mt-3 flex gap-2">
                  <Link href={`/student/resources/video/${r.id}`}>
                    <Button size="sm">Reproducir</Button>
                  </Link>
                  <Button size="sm" variant="ghost" onClick={() => toggle(r.id)}>
                    {saved.has(r.id) ? <BookmarkCheck className="h-4 w-4 text-brand-amber" /> : <Bookmark className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'links' && (
        <div className="space-y-3">
          {['biblioteca', 'bienestar', 'normativa', 'empleo', 'autoayuda'].map((cat) => {
            const items = displayList.filter((r) => r.category === cat);
            if (items.length === 0) return null;
            return (
              <section key={cat}>
                <h2 className="mb-2 text-sm font-medium uppercase text-brand-amber">{cat}</h2>
                <div className="space-y-2">
                  {items.map((r) => (
                    <Card key={r.id} className="flex items-center justify-between gap-4 p-4">
                      <div>
                        <h3 className="font-medium">{r.title}</h3>
                        <p className="text-sm text-zinc-500">{r.description}</p>
                      </div>
                      {r.url && (
                        <a href={r.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 text-brand-amber" />
                        </a>
                      )}
                    </Card>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {tab === 'search' && displayList.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {displayList.map((r) => (
            <Card key={r.id} className="flex justify-between items-start gap-4 p-4">
              <div>
                <h3 className="font-semibold">{r.title}</h3>
                <p className="text-xs text-brand-amber">{r.topic}</p>
                <p className="text-sm text-zinc-500 mt-1">{r.description}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => toggle(r.id)}>
                {saved.has(r.id) ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
              </Button>
            </Card>
          ))}
        </div>
      )}

      {displayList.length === 0 && tab !== 'search' && (
        <p className="text-zinc-500">No hay recursos en esta categoría.</p>
      )}
    </div>
  );
}
