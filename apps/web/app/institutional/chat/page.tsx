'use client';

import { useState, useRef, useEffect } from 'react';
import { Button, Input } from '@/components/ui';
import { PortalCard } from '@/components/portal/PortalCard';
import { MarkdownMessage } from '@/components/ui/MarkdownMessage';
import { proxyJson } from '@/lib/proxy';
import { Send, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  chart?: { type: string; title: string; data: { label: string; value: number }[] } | null;
}

const COLORS = ['#003A70', '#F28C28', '#6366F1', '#4A90C2'];

export default function InstitutionalChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((m) => [...m, { role: 'user', content: userMsg }]);
    setLoading(true);
    try {
      const res = await proxyJson<{ text: string; chart?: Message['chart'] }>('/institutional/chat', {
        method: 'POST',
        body: JSON.stringify({ message: userMsg, history }),
      });
      setMessages((m) => [...m, { role: 'assistant', content: res.text, chart: res.chart }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'No pude procesar su consulta. Intente de nuevo.' }]);
    }
    setLoading(false);
  }

  function renderChart(chart: NonNullable<Message['chart']>) {
    if (!chart?.data?.length) return null;
    if (chart.type === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie data={chart.data} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={60} label>
              {chart.data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      );
    }
    return (
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chart.data}>
          <XAxis dataKey="label" fontSize={11} />
          <YAxis fontSize={11} />
          <Tooltip />
          <Bar dataKey="value" fill="#003A70" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Chat institucional</h1>
        <p className="text-muted">Consulte el estado general de la institución UTB</p>
      </div>

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
                <MarkdownMessage content={m.content} />
                {m.chart && (
                  <div className="mt-3">
                    <p className="text-xs font-medium mb-2">{m.chart.title}</p>
                    {renderChart(m.chart)}
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
          />
          <Button onClick={send} disabled={loading}><Send className="h-4 w-4" /></Button>
        </div>
      </PortalCard>
    </div>
  );
}
