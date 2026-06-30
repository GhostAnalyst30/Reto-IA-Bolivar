'use client';

import { useState } from 'react';
import { Button, Card, Input } from '@/components/ui';
import { proxyJson, proxyStream } from '@/lib/proxy';

const TUTOR_CHAT_TITLE = 'Tutor RAG';

export default function TutorPage() {
  const [topic, setTopic] = useState('');
  const [response, setResponse] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function getOrCreateTutorChat(): Promise<string> {
    const chats = await proxyJson<{ id: string; title: string }[]>('/chats');
    const existing = chats.find((c) => c.title === TUTOR_CHAT_TITLE);
    if (existing) return existing.id;
    const chat = await proxyJson<{ id: string }>('/chats', {
      method: 'POST',
      body: JSON.stringify({ title: TUTOR_CHAT_TITLE }),
    });
    return chat.id;
  }

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResponse('');
    setError('');
    try {
      const chatId = await getOrCreateTutorChat();
      const prompt = `Explícame el tema "${topic}" citando recursos del catálogo institucional.`;
      let text = '';
      await proxyStream(
        `/chats/${chatId}/messages`,
        { content: prompt },
        (token) => {
          text += token;
          setResponse(text);
        },
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al consultar al tutor');
    }
    setLoading(false);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <h2 className="font-semibold">Tutor RAG contextual</h2>
        <p className="text-sm text-zinc-500 mt-1">Pregunta sobre un tema; el tutor cita recursos del catálogo seed.</p>
        <form onSubmit={ask} className="mt-4 flex gap-3">
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ej: machine learning, SQL..." required />
          <Button type="submit" disabled={loading}>{loading ? '...' : 'Preguntar'}</Button>
        </form>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </Card>
      {response && (
        <Card>
          <h3 className="font-semibold text-brand-amber mb-3">Respuesta del tutor</h3>
          <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{response}</p>
        </Card>
      )}
    </div>
  );
}
