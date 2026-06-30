'use client';

import { useEffect, useState, useRef } from 'react';
import { Button, Input } from '@/components/ui';
import { BentoGrid, BentoCell } from '@/components/ui/BentoGrid';
import { Brain, Loader2, Send } from 'lucide-react';
import { proxyJson } from '@/lib/proxy';

interface Program { id: string; name: string; description?: string }
interface Turn { role: string; content: string; reasoning?: string }

export default function VocationalPage() {
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggested, setSuggested] = useState<Program[]>([]);
  const [status, setStatus] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    proxyJson<{ answers?: Turn[]; id?: string; status?: string } | null>('/vocational/assessment')
      .then((a) => {
        if (a?.answers) setTurns(a.answers);
        if (a?.id) setAssessmentId(a.id);
        if (a?.status) setStatus(a.status);
      })
      .catch(() => {});
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [turns]);

  async function send() {
    if (!input.trim() || loading) return;
    const content = input.trim();
    setInput('');
    setTurns((t) => [...t, { role: 'user', content }]);
    setLoading(true);
    try {
      const data = await proxyJson<{
        assessment_id: string;
        reply: string;
        reasoning: string;
        suggested_programs: Program[];
        status: string;
      }>('/vocational/message', {
        method: 'POST',
        body: JSON.stringify({ content, assessment_id: assessmentId }),
      });
      setAssessmentId(data.assessment_id);
      setTurns((t) => [...t, { role: 'assistant', content: data.reply, reasoning: data.reasoning }]);
      setSuggested(data.suggested_programs || []);
      setStatus(data.status);
    } catch {
      setTurns((t) => [...t, { role: 'assistant', content: 'Lo siento, el servidor no funciona' }]);
    }
    setLoading(false);
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <h1 className="font-display text-2xl font-bold">Test vocacional avanzado</h1>
      <BentoGrid cols={3} className="flex-1 min-h-0">
        <BentoCell colSpan={2} className="flex flex-col overflow-hidden min-h-[400px]">
          <div className="flex-1 overflow-y-auto space-y-4">
            {turns.length === 0 && (
              <p className="text-zinc-500 text-center py-8">Cuéntame sobre tus intereses, habilidades y materias favoritas.</p>
            )}
            {turns.map((t, i) => (
              <div key={i} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${t.role === 'user' ? 'bg-brand-amber/20' : 'border border-brand-border bg-brand-bg'}`}>
                  {t.reasoning && (
                    <details className="mb-2 text-xs text-brand-amber">
                      <summary className="cursor-pointer flex items-center gap-1"><Brain className="h-3 w-3" /> Razonamiento</summary>
                      <p className="mt-1 text-zinc-500">{t.reasoning}</p>
                    </details>
                  )}
                  {t.content}
                </div>
              </div>
            ))}
            {loading && <div className="flex items-center gap-2 text-brand-amber text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Analizando…</div>}
            <div ref={bottomRef} />
          </div>
          <div className="mt-4 flex gap-2 border-t border-brand-border pt-4">
            <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Tu respuesta…" disabled={loading || status === 'completed'} />
            <Button onClick={send} disabled={loading || status === 'completed'} aria-label="Enviar"><Send className="h-4 w-4" /></Button>
          </div>
        </BentoCell>
        <BentoCell>
          <p className="font-medium mb-3">Programas sugeridos UTB</p>
          {suggested.length === 0 && <p className="text-sm text-zinc-500">Continúe la conversación para recibir sugerencias.</p>}
          <ul className="space-y-3">
            {suggested.map((p) => (
              <li key={p.id} className="rounded-lg border border-brand-amber/30 bg-brand-amber/5 p-3 text-sm">
                <p className="font-medium">{p.name}</p>
                {p.description && <p className="mt-1 text-zinc-500">{p.description}</p>}
              </li>
            ))}
          </ul>
        </BentoCell>
      </BentoGrid>
    </div>
  );
}
