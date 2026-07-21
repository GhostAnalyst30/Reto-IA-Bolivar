'use client';

import { useState, useRef, useEffect } from 'react';
import { Button, Input } from '@/components/ui';
import { PortalCard } from '@/components/portal/PortalCard';
import { LazyMarkdownMessage } from '@/components/ui/LazyMarkdownMessage';
import { LazyChatChart } from '@/components/portal/charts/LazyChatChart';
import { proxyJson } from '@/lib/proxy';
import { Send, Loader2, UserRound } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  chart?: { type: string; title: string; data: { label: string; value: number }[] } | null;
}

export default function InstitutionalChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [handoff, setHandoff] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(messageOverride?: string, escalate = false) {
    const userMsg = (messageOverride ?? input).trim();
    if ((!userMsg && !escalate) || loading) return;
    if (!escalate) setInput('');
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    const displayMsg = escalate
      ? 'Prefiero continuar con apoyo humano / escalar esta consulta.'
      : userMsg;
    setMessages((m) => [...m, { role: 'user', content: displayMsg }]);
    setLoading(true);
    try {
      const res = await proxyJson<{
        text: string;
        chart?: Message['chart'];
        degraded?: boolean;
        handoff?: boolean;
      }>(
        '/institutional/chat',
        {
          method: 'POST',
          body: JSON.stringify({
            message: escalate
              ? 'El usuario solicita escalar a humano (human in the loop). Resume el contexto y confirma el handoff.'
              : userMsg,
            history,
          }),
          soft: true,
        },
      );
      const text =
        res.text ||
        'El asistente institucional está en modo limitado. Puede consultar el dashboard mientras restablecemos la respuesta completa.';
      if (res.handoff) setHandoff(true);
      setMessages((m) => [...m, { role: 'assistant', content: text, chart: res.chart }]);
    } catch {
      setHandoff(true);
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content:
            'No pude completar la respuesta automática. Use el panel de apoyo humano o CareQueue para seguimiento.',
        },
      ]);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Chat institucional</h1>
          <p className="text-muted">Consulte datos del sistema UTB (modo privilegiado para staff)</p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          disabled={loading || handoff}
          onClick={() => send(undefined, true)}
        >
          <UserRound className="mr-1 h-4 w-4" />
          Escalar a humano
        </Button>
      </div>

      {handoff && (
        <p className="text-sm text-amber-500">
          Consulta marcada para seguimiento humano. Revise Apoyo humano / CareQueue / Inbox bienestar según corresponda.
        </p>
      )}

      <PortalCard className="flex flex-col min-h-[500px] max-h-[calc(100vh-12rem)]">
        <div className="flex-1 overflow-y-auto space-y-4 p-4">
          {messages.length === 0 && (
            <p className="text-center text-muted py-12">
              Pregunte, por ejemplo: &quot;¿Cuántos estudiantes están en riesgo alto?&quot; o &quot;¿Cómo va el engagement?&quot;
            </p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-lg px-4 py-3 text-sm ${
                m.role === 'user'
                  ? 'bg-[color-mix(in_srgb,var(--portal-accent)_15%,transparent)]'
                  : 'border border-brand-border bg-brand-bg'
              }`}>
                <LazyMarkdownMessage content={m.content} />
                {m.chart && (
                  <div className="mt-3">
                    <p className="text-xs font-medium mb-2">{m.chart.title}</p>
                    <LazyChatChart chart={m.chart} />
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && <Loader2 className="h-5 w-5 animate-spin text-[var(--portal-accent)]" />}
          <div ref={bottomRef} />
        </div>
        <div className="border-t border-brand-border p-3 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escriba su consulta institucional..."
            onKeyDown={(e) => e.key === 'Enter' && send()}
            disabled={handoff}
          />
          <Button onClick={() => send()} disabled={loading || handoff}><Send className="h-4 w-4" /></Button>
        </div>
      </PortalCard>
    </div>
  );
}
