'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Input, LoadingState, EmptyState } from '@/components/ui';
import { Bookmark, BookmarkCheck, Play, ExternalLink, Search, FolderOpen } from 'lucide-react';
import { proxyJson } from '@/lib/proxy';
import { cn } from '@/lib/utils';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const type = tab === 'videos' ? 'youtube' : tab === 'links' ? 'link' : undefined;
    const qs = type ? `?type=${type}` : '';
    Promise.all([
      proxyJson<Resource[]>(`/resources${qs}`),
      proxyJson<{ resource_id: string }[]>('/saved-resources'),
    ])
      .then(([data, savedData]) => {
        setResources(Array.isArray(data) ? data : []);
        setSaved(new Set((Array.isArray(savedData) ? savedData : []).map((s) => s.resource_id)));
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false));
  }, [tab]);

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
      setSaved((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
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
    <main className="mx-auto max-w-7xl space-y-8 px-5 pb-24 pt-24 md:px-8 md:pb-16">
      <div>
        <h1 className="text-4xl font-bold text-primary">Recursos y apoyo UTB</h1>
        <p className="mt-2 text-lg text-on-surface-variant">
          Videos, enlaces institucionales y buscador de recursos
        </p>
      </div>

      <div className="relative flex w-full max-w-2xl rounded-xl bg-surface-container-low p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'relative z-10 flex-1 rounded-lg px-3 py-2.5 text-center text-sm font-semibold transition-colors',
              tab === t.id
                ? 'bg-surface-container-lowest text-primary shadow-sm dark:bg-surface-container-highest'
                : 'text-on-surface-variant hover:text-primary',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'search' && (
        <form onSubmit={doSearch} className="glass-card flex gap-2 rounded-2xl p-3">
          <Input
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Buscar recursos..."
            className="flex-1"
          />
          <Button type="submit">
            <Search className="h-4 w-4" />
          </Button>
        </form>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {loading && tab !== 'search' && <LoadingState />}

      {!loading && tab === 'videos' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayList.map((r) => (
            <Card key={r.id} className="overflow-hidden !p-0">
              <div className="flex aspect-video items-center justify-center bg-primary/10">
                <Play className="h-10 w-10 text-primary" />
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-on-surface">{r.title}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-on-surface-variant">{r.description}</p>
                <div className="mt-3 flex gap-2">
                  <Link href={`/student/resources/video/${r.id}`}>
                    <Button size="sm">Reproducir</Button>
                  </Link>
                  <Button size="sm" variant="ghost" onClick={() => toggle(r.id)}>
                    {saved.has(r.id) ? (
                      <BookmarkCheck className="h-4 w-4 text-primary" />
                    ) : (
                      <Bookmark className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && tab === 'links' && (
        <div className="space-y-3">
          {['biblioteca', 'bienestar', 'normativa', 'empleo', 'autoayuda'].map((cat) => {
            const items = displayList.filter((r) => r.category === cat);
            if (items.length === 0) return null;
            return (
              <section key={cat}>
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">{cat}</h2>
                <div className="space-y-2">
                  {items.map((r) => (
                    <Card key={r.id} className="flex items-center justify-between gap-4 !p-4">
                      <div>
                        <h3 className="font-medium text-on-surface">{r.title}</h3>
                        <p className="text-sm text-on-surface-variant">{r.description}</p>
                      </div>
                      {r.url && (
                        <a href={r.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 text-primary" />
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
            <Card key={r.id} className="flex items-start justify-between gap-4 !p-4">
              <div>
                <h3 className="font-semibold text-on-surface">{r.title}</h3>
                <p className="text-xs text-primary">{r.topic}</p>
                <p className="mt-1 text-sm text-on-surface-variant">{r.description}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                {r.url && (
                  <a href={r.url} target="_blank" rel="noopener noreferrer" aria-label="Abrir recurso">
                    <ExternalLink className="h-4 w-4 text-primary" />
                  </a>
                )}
                <Button size="sm" variant="ghost" onClick={() => toggle(r.id)}>
                  {saved.has(r.id) ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && displayList.length === 0 && tab !== 'search' && (
        <EmptyState
          icon={<FolderOpen className="h-8 w-8" />}
          title="No hay recursos en esta categoría"
          description="Aún no se han publicado recursos aquí. Prueba el buscador o vuelve más tarde."
        />
      )}
    </main>
  );
}
