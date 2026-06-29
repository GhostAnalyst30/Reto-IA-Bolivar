'use client';

import { useState } from 'react';
import { Button, Card, Input } from '@/components/ui';

export default function TutorPage() {
  const [topic, setTopic] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResponse('');
    const res = await fetch('/api/proxy?path=/chats', { method: 'POST', body: JSON.stringify({ title: `Tutor: ${topic}` }) });
    const chat = await res.json();
    const msgRes = await fetch(`/api/proxy?path=/chats/${chat.id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content: `Explícame el tema "${topic}" citando recursos del catálogo institucional.` }),
    });
    const reader = msgRes.body?.getReader();
    const decoder = new TextDecoder();
    let text = '';
    if (reader) {
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const d = JSON.parse(line.slice(6));
              if (d.token) { text += d.token; setResponse(text); }
            } catch { /* skip */ }
          }
        }
      }
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
