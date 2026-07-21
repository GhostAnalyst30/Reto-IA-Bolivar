'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Card } from '@/components/ui';
import { proxyJson } from '@/lib/proxy';

interface Resource {
  id: string;
  title: string;
  description?: string;
  url?: string;
}

function toYoutubeEmbed(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.includes('/embed/')) return url;
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.replace('/', '');
      return id ? `https://www.youtube.com/embed/${id}` : url;
    }
    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v');
      if (id) return `https://www.youtube.com/embed/${id}`;
      const shorts = u.pathname.match(/\/shorts\/([^/]+)/);
      if (shorts?.[1]) return `https://www.youtube.com/embed/${shorts[1]}`;
    }
  } catch {
    // keep raw
  }
  return url;
}

export default function VideoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [resource, setResource] = useState<Resource | null>(null);

  useEffect(() => {
    proxyJson<Resource[]>('/resources?type=youtube')
      .then((list) => {
        const found = (Array.isArray(list) ? list : []).find((r) => r.id === id);
        setResource(found || null);
      })
      .catch(() => setResource(null));
  }, [id]);

  if (!resource) return <p className="text-zinc-500">Cargando video...</p>;

  const embedUrl = toYoutubeEmbed(resource.url);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button variant="ghost" onClick={() => router.back()}>← Volver a recursos</Button>
      <h1 className="font-display text-2xl font-bold">{resource.title}</h1>
      {embedUrl && (
        <div className="aspect-video w-full overflow-hidden rounded-lg border border-brand-border">
          <iframe
            src={embedUrl}
            title={resource.title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
      {resource.url && (
        <a href={resource.url} target="_blank" rel="noopener noreferrer">
          <Button size="sm" variant="secondary">Abrir en YouTube</Button>
        </a>
      )}
      {resource.description && (
        <Card><p className="text-zinc-400">{resource.description}</p></Card>
      )}
    </div>
  );
}
