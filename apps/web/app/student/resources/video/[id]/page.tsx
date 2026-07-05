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

  const embedUrl = resource.url?.includes('embed') ? resource.url : resource.url;

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
      {resource.description && (
        <Card><p className="text-zinc-400">{resource.description}</p></Card>
      )}
    </div>
  );
}
