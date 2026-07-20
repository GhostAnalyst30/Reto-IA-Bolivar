'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { Button, Card, Input } from '@/components/ui';
import { PrivacyBanner } from '@/components/ui/PrivacyBanner';
import { LazyMarkdownMessage } from '@/components/ui/LazyMarkdownMessage';
import { BentoCell } from '@/components/ui/BentoGrid';
import { Send, Plus, MessageSquare, Heart, Loader2, Phone, AlertCircle, UserRound } from 'lucide-react';
import { proxyJson, proxyStream, type HandoffPayload } from '@/lib/proxy';

interface Chat {
  id: string;
  title: string;
  updated_at: string;
  handoff_mode?: string;
}
interface MessageAuthor {
  full_name?: string;
  email?: string;
}
interface Message {
  id: string;
  role: string;
  content: string;
  author?: MessageAuthor;
}
interface SelfHelp { id: string; title: string; description?: string; url?: string }

const PSYCHOLOGIST_EMAIL = 'psicologo@utb.edu.co';

export default function TwinChatPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [handoffMode, setHandoffMode] = useState<'ai' | 'human' | 'resolved'>('ai');
  const [counselor, setCounselor] = useState<MessageAuthor | null>(null);
  const [waitingForCounselor, setWaitingForCounselor] = useState(false);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [selfHelp, setSelfHelp] = useState<SelfHelp[]>([]);
  const [mood, setMood] = useState<number | null>(null);
  const [showSupport, setShowSupport] = useState(false);
  const [supportReason, setSupportReason] = useState('');
  const [error, setError] = useState('');
  const [privacyNotice, setPrivacyNotice] = useState('');
  const [limitReached, setLimitReached] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadChats(); }, []);
  useEffect(() => { if (activeChat) loadMessages(activeChat); }, [activeChat]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, waitingForCounselor]);

  useEffect(() => {
    if (handoffMode !== 'human' || !activeChat) return;
    const t = setInterval(() => { loadMessages(activeChat, true); }, 15000);
    return () => clearInterval(t);
  }, [handoffMode, activeChat]);

  const applyHandoff = useCallback((payload: HandoffPayload) => {
    setHandoffMode('human');
    setCounselor(payload.counselor);
    setWaitingForCounselor(true);
    setChats((prev) => prev.map((c) => (
      c.id === activeChat ? { ...c, handoff_mode: 'human' } : c
    )));
  }, [activeChat]);

  async function loadSelfHelpFromConversation(msgs: Message[], latest?: string) {
    try {
      const recent = msgs.filter((m) => m.role === 'user').slice(-3).map((m) => m.content).join(' ');
      const query = (recent || latest || 'bienestar').slice(0, 200);
      let data = await proxyJson<SelfHelp[]>(`/self-help?topic=${encodeURIComponent(query)}`);
      if ((!Array.isArray(data) || data.length === 0) && query !== 'bienestar') {
        data = await proxyJson<SelfHelp[]>('/self-help?topic=bienestar');
      }
      setSelfHelp(Array.isArray(data) ? data.slice(0, 4) : []);
    } catch { /* optional */ }
  }

  async function loadChats() {
    try {
      const data = await proxyJson<Chat[]>('/chats?chat_type=digital_twin');
      setChats(data || []);
      if (data?.[0]) {
        setActiveChat(data[0].id);
        const mode = (data[0].handoff_mode || 'ai') as 'ai' | 'human' | 'resolved';
        setHandoffMode(mode);
      } else {
        const chat = await proxyJson<Chat>('/chats', {
          method: 'POST',
          body: JSON.stringify({ title: 'Mi espacio seguro', chat_type: 'digital_twin' }),
        });
        setChats([chat]);
        setActiveChat(chat.id);
        setHandoffMode('ai');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar chats');
    }
  }

  async function loadMessages(chatId: string, silent = false) {
    try {
      const data = await proxyJson<{ chat?: { handoff_mode?: string }; messages?: Message[] } | Message[]>(
        `/chats/${chatId}/messages`,
      );
      let list: Message[] = [];
      let mode: 'ai' | 'human' | 'resolved' = 'ai';
      if (Array.isArray(data)) {
        list = data;
      } else {
        list = data.messages || [];
        mode = (data.chat?.handoff_mode || 'ai') as 'ai' | 'human' | 'resolved';
        setHandoffMode(mode);
      }
      setMessages(list);
      setLimitReached(list.filter((m) => m.role === 'user').length >= 15);
      const lastCounselor = [...list].reverse().find((m) => m.role === 'counselor');
      if (lastCounselor?.author) setCounselor(lastCounselor.author);
      if (mode === 'human') {
        setWaitingForCounselor(list.length === 0 || list[list.length - 1].role === 'user');
      } else {
        setWaitingForCounselor(false);
      }
      if (!silent) loadSelfHelpFromConversation(list);
    } catch {
      if (!silent) setMessages([]);
    }
  }

  async function newChat() {
    const chat = await proxyJson<Chat>('/chats', {
      method: 'POST',
      body: JSON.stringify({ title: 'Nueva conversación', chat_type: 'digital_twin' }),
    });
    setChats((c) => [chat, ...c]);
    setActiveChat(chat.id);
    setMessages([]);
    setHandoffMode('ai');
    setCounselor(null);
    setWaitingForCounselor(false);
    setLimitReached(false);
    setError('');
  }

  async function requestHumanHandoff(reason?: string) {
    if (!activeChat) return;
    try {
      const payload = await proxyJson<HandoffPayload>(`/chats/${activeChat}/handoff`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason || 'Prefiero hablar con una persona' }),
      });
      applyHandoff(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo conectar con bienestar');
    }
  }

  async function send() {
    if (!input.trim() || !activeChat || streaming || limitReached || handoffMode === 'resolved') return;
    const content = input.trim();
    setInput('');
    const nextMsgs = [...messages, { id: `u-${Date.now()}`, role: 'user', content }];
    setMessages(nextMsgs);
    setStreaming(true);
    setError('');
    let assistant = '';
    try {
      const result = await proxyStream(`/chats/${activeChat}/messages`, { content }, {
        onToken: (token) => {
          assistant += token;
          setMessages((m) => {
            const copy = [...m];
            const last = copy[copy.length - 1];
            if (last?.role === 'assistant') {
              copy[copy.length - 1] = { ...last, content: assistant };
            } else {
              copy.push({ id: `a-${Date.now()}`, role: 'assistant', content: assistant });
            }
            return copy;
          });
        },
        onHandoffWaiting: (payload) => applyHandoff(payload),
        onGuardrail: (payload) => {
          if (payload.privacy_notice) setPrivacyNotice(payload.privacy_notice);
        },
      });
      if (result.handoff) applyHandoff(result.handoff);
      // If tokens never arrived but done/fallback returned content, paint the bubble.
      if (!assistant.trim() && result.content?.trim()) {
        assistant = result.content.trim();
        setMessages((m) => [...m, { id: `a-${Date.now()}`, role: 'assistant', content: assistant }]);
      }
      const userCount = nextMsgs.filter((m) => m.role === 'user').length;
      if (userCount >= 15) setLimitReached(true);
      loadSelfHelpFromConversation(nextMsgs, content);
      if (activeChat) loadMessages(activeChat, true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      const status = e && typeof e === 'object' && 'status' in e ? Number((e as { status: number }).status) : 0;
      if (
        status === 409 ||
        msg.includes('409') ||
        msg.toLowerCase().includes('nuevo chat') ||
        msg.toLowerCase().includes('15') ||
        msg.toLowerCase().includes('cerrada')
      ) {
        if (msg.toLowerCase().includes('cerrada')) {
          setHandoffMode('resolved');
          setError('Esta conversación fue cerrada. Inicia una conversación nueva para continuar.');
        } else {
          setLimitReached(true);
          setError('Has alcanzado el límite de 15 mensajes. Inicia una conversación nueva para continuar.');
        }
      } else if (status === 429) {
        setError('Demasiados mensajes. Espera un momento e intenta de nuevo.');
      } else {
        // Keep the chat usable: show a soft assistant bubble instead of forcing human handoff.
        const soft =
          'El servicio está temporalmente limitado. Puedes seguir escribiendo; intentaremos responder en el próximo mensaje.';
        setMessages((m) => [...m, { id: `a-${Date.now()}`, role: 'assistant', content: soft }]);
        setError('');
      }
    }
    setStreaming(false);
  }

  async function submitMood(score: number) {
    setMood(score);
    await proxyJson('/mood-checkins', { method: 'POST', body: JSON.stringify({ mood_score: score }) });
  }

  async function requestSupport() {
    await proxyJson('/support-requests', {
      method: 'POST',
      body: JSON.stringify({ chat_id: activeChat, reason: supportReason || 'Solicitud de apoyo psicológico' }),
    });
    applyHandoff({
      handoff_mode: 'human',
      counselor: {
        full_name: counselor?.full_name || 'Equipo de bienestar UTB',
        email: counselor?.email || PSYCHOLOGIST_EMAIL,
      },
    });
    setShowSupport(false);
    setSupportReason('');
  }

  const counselorLabel = counselor?.full_name || 'Equipo de bienestar UTB';
  const counselorEmail = counselor?.email || PSYCHOLOGIST_EMAIL;
  const chatClosed = handoffMode === 'resolved';

  return (
    <div className="space-y-4">
      <PrivacyBanner />
      {privacyNotice && (
        <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-3 text-sm">
          {privacyNotice}
        </div>
      )}
      {handoffMode === 'human' && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4">
          <UserRound className="h-5 w-5 text-emerald-500 shrink-0" />
          <div className="flex-1 text-sm">
            <p className="font-medium">Estás conversando con Bienestar UTB</p>
            <p className="text-xs text-muted">{counselorLabel} · {counselorEmail}</p>
          </div>
        </div>
      )}
      {chatClosed && (
        <div className="flex items-center gap-3 rounded-lg border border-zinc-500/40 bg-zinc-500/10 p-4">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">Conversación cerrada por bienestar</p>
            <p className="text-xs text-muted">Inicia un chat nuevo si necesitas seguir conversando.</p>
          </div>
          <Button size="sm" onClick={newChat}><Plus className="h-4 w-4 mr-1" />Nuevo chat</Button>
        </div>
      )}
      {limitReached && !chatClosed && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">Límite de conversación alcanzado</p>
            <p className="text-xs text-muted">Para continuar el acompañamiento, inicia un chat nuevo.</p>
          </div>
          <Button size="sm" onClick={newChat}><Plus className="h-4 w-4 mr-1" />Nuevo chat</Button>
        </div>
      )}
      <div className="flex flex-col gap-4 lg:flex-row lg:h-[calc(100vh-10rem)]">
        <aside className="w-full lg:w-48 shrink-0 space-y-2">
          <Button size="sm" variant="secondary" onClick={newChat} className="w-full">
            <Plus className="h-4 w-4 mr-1" /> Nueva
          </Button>
          {chats.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setActiveChat(c.id);
                setHandoffMode((c.handoff_mode || 'ai') as 'ai' | 'human' | 'resolved');
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${
                activeChat === c.id ? 'bg-brand-amber/10 text-brand-amber' : 'hover:bg-brand-bg'
              }`}
            >
              <MessageSquare className="h-4 w-4 shrink-0" />
              <span className="truncate">{c.title}</span>
              {c.handoff_mode === 'human' && (
                <span className="ml-auto h-2 w-2 rounded-full bg-emerald-500 shrink-0" title="Con psicólogo" />
              )}
            </button>
          ))}
        </aside>

        <BentoCell className="flex flex-1 flex-col min-h-[400px] overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-4 p-2">
            {messages.length === 0 && (
              <p className="text-center text-zinc-500 py-12">
                <Heart className="mx-auto h-8 w-8 text-brand-amber mb-2" />
                Este es tu espacio seguro. ¿Cómo te sientes hoy?
              </p>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${
                  m.role === 'user'
                    ? 'bg-brand-amber/20'
                    : m.role === 'counselor'
                      ? 'border border-emerald-500/30 bg-emerald-500/5'
                      : 'border border-brand-border bg-brand-bg'
                }`}>
                  {m.role === 'counselor' && (
                    <p className="mb-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      {m.author?.full_name || counselorLabel} · {m.author?.email || counselorEmail}
                    </p>
                  )}
                  {m.role === 'assistant' || m.role === 'counselor' ? (
                    <LazyMarkdownMessage content={m.content} />
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            ))}
            {waitingForCounselor && handoffMode === 'human' && !streaming && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-muted">
                  Mensaje enviado. Un psicólogo te responderá aquí mismo en este chat.
                </div>
              </div>
            )}
            {streaming && <Loader2 className="h-5 w-5 animate-spin text-brand-amber" />}
            <div ref={bottomRef} />
          </div>
          <div className="border-t border-brand-border p-3 space-y-2">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} type="button" title={`Ánimo ${s}/5`} onClick={() => submitMood(s)}
                  className={`text-lg ${mood === s ? 'scale-125' : 'opacity-50 hover:opacity-100'}`}>
                  {['😔', '😕', '😐', '🙂', '😊'][s - 1]}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={handoffMode === 'human' ? 'Escribe al psicólogo…' : 'Escribe aquí…'}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                disabled={limitReached || chatClosed}
              />
              <Button onClick={send} disabled={streaming || limitReached || chatClosed}><Send className="h-4 w-4" /></Button>
            </div>
            {handoffMode === 'ai' && (
              <Button variant="secondary" size="sm" onClick={() => requestHumanHandoff()} className="w-full">
                <UserRound className="h-4 w-4 mr-2" /> Prefiero hablar con una persona
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => setShowSupport(true)} className="w-full" disabled={chatClosed}>
              <Phone className="h-4 w-4 mr-2" /> Solicitar apoyo humano
            </Button>
          </div>
        </BentoCell>

        <aside className="w-full lg:w-64 shrink-0">
          <Card>
            <h3 className="font-semibold text-sm mb-3">Recursos de autoayuda</h3>
            {selfHelp.length === 0 ? (
              <p className="text-xs text-zinc-500">Los recursos cambian según tu conversación.</p>
            ) : (
              <ul className="space-y-2">
                {selfHelp.map((r) => (
                  <li key={r.id} className="text-sm">
                    <p className="font-medium">{r.title}</p>
                    {r.url && (
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-amber hover:underline">
                        Ver recurso
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>

      {showSupport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-md space-y-4">
            <h3 className="font-semibold">Solicitar apoyo humano</h3>
            <PrivacyBanner message="Con tu consentimiento, un psicólogo de bienestar UTB te responderá en este mismo chat." />
            <Input value={supportReason} onChange={(e) => setSupportReason(e.target.value)} placeholder="Motivo (opcional)" />
            <div className="flex gap-2">
              <Button onClick={requestSupport}>Conectar con psicólogo</Button>
              <Button variant="secondary" onClick={() => setShowSupport(false)}>Cancelar</Button>
            </div>
          </Card>
        </div>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
