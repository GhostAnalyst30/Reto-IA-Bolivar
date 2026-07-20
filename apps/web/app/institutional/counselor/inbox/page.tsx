'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Input, LoadingState, EmptyState } from '@/components/ui';
import { LazyMarkdownMessage } from '@/components/ui/LazyMarkdownMessage';
import { PortalCard } from '@/components/portal/PortalCard';
import { proxyJson } from '@/lib/proxy';
import { Inbox, Send, CheckCircle, Loader2 } from 'lucide-react';

interface InboxChat {
  id: string;
  title: string;
  updated_at: string;
  student_name?: string;
  student_email?: string;
  last_message?: string;
  needs_reply?: boolean;
}

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  created_at?: string;
  author?: { full_name?: string; email?: string };
}

interface ThreadResponse {
  chat: { id: string; title: string; handoff_mode: string };
  student: { full_name?: string; email?: string };
  messages: ChatMessage[];
}

export default function CounselorInboxPage() {
  const [inbox, setInbox] = useState<InboxChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [thread, setThread] = useState<ThreadResponse | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [resolving, setResolving] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadInbox = useCallback(async () => {
    const data = await proxyJson<InboxChat[]>('/institutional/counselor/inbox');
    const list = Array.isArray(data) ? data : [];
    setInbox(list);
    setActiveChatId((current) => current ?? list[0]?.id ?? null);
    return list;
  }, []);

  const loadThread = useCallback(async (chatId: string, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await proxyJson<ThreadResponse>(`/institutional/counselor/chats/${chatId}/messages`);
      setThread(data);
    } catch {
      if (!silent) setThread(null);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInbox().finally(() => setLoading(false));
  }, [loadInbox]);

  useEffect(() => {
    if (activeChatId) loadThread(activeChatId);
  }, [activeChatId, loadThread]);

  useEffect(() => {
    if (!activeChatId) return;
    const t = setInterval(() => {
      loadInbox();
      loadThread(activeChatId, true);
    }, 15000);
    return () => clearInterval(t);
  }, [activeChatId, loadInbox, loadThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread?.messages, sending]);

  async function sendReply() {
    if (!activeChatId || !input.trim() || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);
    try {
      await proxyJson(`/institutional/counselor/chats/${activeChatId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
      await loadThread(activeChatId, true);
      await loadInbox();
    } finally {
      setSending(false);
    }
  }

  async function resolveChat() {
    if (!activeChatId || resolving) return;
    setResolving(true);
    try {
      await proxyJson(`/institutional/counselor/chats/${activeChatId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'resolved' }),
      });
      await loadInbox();
      setActiveChatId(null);
      setThread(null);
    } finally {
      setResolving(false);
    }
  }

  const activeInbox = inbox.find((c) => c.id === activeChatId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Inbox de bienestar</h1>
        <p className="text-muted">Chats 1-1 con estudiantes que necesitan apoyo humano</p>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:h-[calc(100vh-12rem)]">
        <aside className="w-full lg:w-72 shrink-0 space-y-2 overflow-y-auto max-h-64 lg:max-h-none">
          {loading && inbox.length === 0 ? (
            <LoadingState rows={3} />
          ) : inbox.length === 0 ? (
            <EmptyState
              icon={<Inbox className="h-8 w-8" />}
              title="Sin chats pendientes"
              description="Cuando un estudiante pida apoyo humano o falle la IA, aparecerá aquí."
            />
          ) : (
            inbox.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveChatId(c.id)}
                className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${
                  activeChatId === c.id
                    ? 'border-emerald-500/50 bg-emerald-500/10'
                    : 'border-brand-border hover:bg-brand-bg'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium truncate">{c.student_name || c.student_email}</span>
                  {c.needs_reply && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" title="Sin responder" />
                  )}
                </div>
                <p className="text-xs text-muted truncate mt-1">{c.last_message || c.title}</p>
              </button>
            ))
          )}
        </aside>

        <PortalCard className="flex flex-1 flex-col min-h-[400px] overflow-hidden">
          {!activeChatId ? (
            <div className="flex flex-1 items-center justify-center text-muted text-sm p-8">
              Selecciona una conversación del inbox
            </div>
          ) : loading && !thread ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-brand-amber" />
            </div>
          ) : (
            <>
              <div className="border-b border-brand-border p-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{thread?.student?.full_name || activeInbox?.student_name}</p>
                  <p className="text-xs text-muted">{thread?.student?.email || activeInbox?.student_email}</p>
                </div>
                <Button size="sm" variant="secondary" disabled={resolving} onClick={resolveChat}>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  {resolving ? 'Cerrando…' : 'Marcar resuelto'}
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 p-3">
                {(thread?.messages || []).map((m) => (
                  <div key={m.id} className={`flex ${m.role === 'counselor' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${
                      m.role === 'counselor'
                        ? 'bg-emerald-500/15 border border-emerald-500/30'
                        : m.role === 'user'
                          ? 'bg-brand-bg border border-brand-border'
                          : 'bg-brand-bg/50 border border-brand-border text-muted'
                    }`}>
                      {m.role === 'counselor' && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">Tú</p>
                      )}
                      {m.role === 'user' && (
                        <p className="text-xs text-muted mb-1">Estudiante</p>
                      )}
                      {m.role === 'assistant' && (
                        <p className="text-xs text-muted mb-1">Asistente IA (historial)</p>
                      )}
                      {m.role === 'assistant' || m.role === 'counselor' ? (
                        <LazyMarkdownMessage content={m.content} />
                      ) : (
                        m.content
                      )}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              <div className="border-t border-brand-border p-3 flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Escribe tu respuesta al estudiante…"
                  onKeyDown={(e) => e.key === 'Enter' && sendReply()}
                  disabled={sending}
                />
                <Button onClick={sendReply} disabled={sending || !input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </PortalCard>
      </div>
    </div>
  );
}
