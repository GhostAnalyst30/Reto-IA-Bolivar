'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { Button, Card, Input } from '@/components/ui';
import { PrivacyBanner } from '@/components/ui/PrivacyBanner';
import { LazyMarkdownMessage } from '@/components/ui/LazyMarkdownMessage';
import {
  AlertCircle,
  ArrowRight,
  Bot,
  Brain,
  ChevronDown,
  Heart,
  MessageSquare,
  Plus,
  Send,
  User,
  UserRound,
} from 'lucide-react';
import { proxyJson, proxyStream, type HandoffPayload } from '@/lib/proxy';
import { cn } from '@/lib/utils';

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
interface SelfHelp {
  id: string;
  title: string;
  description?: string;
  url?: string;
}

type CompanionMode = 'twin' | 'human';

const PSYCHOLOGIST_EMAIL = 'psicologo@utb.edu.co';

export default function TwinChatPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [handoffMode, setHandoffMode] = useState<'ai' | 'human' | 'resolved'>('ai');
  const [companionMode, setCompanionMode] = useState<CompanionMode>('twin');
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
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const activeChatRef = useRef<string | null>(null);
  const streamingChatRef = useRef<string | null>(null);

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  useEffect(() => {
    loadChats();
  }, []);

  useEffect(() => {
    if (activeChat) loadMessages(activeChat);
  }, [activeChat]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, waitingForCounselor]);

  useEffect(() => {
    if (handoffMode !== 'human' || !activeChat) return;
    const t = setInterval(() => {
      loadMessages(activeChat, true);
    }, 15000);
    return () => clearInterval(t);
  }, [handoffMode, activeChat]);

  const applyHandoff = useCallback((payload: HandoffPayload, chatId?: string | null) => {
    const target = chatId ?? activeChatRef.current;
    if (target !== activeChatRef.current) return;
    setHandoffMode('human');
    setCompanionMode('human');
    setCounselor(payload.counselor);
    setWaitingForCounselor(true);
    setChats((prev) =>
      prev.map((c) => (c.id === target ? { ...c, handoff_mode: 'human' } : c)),
    );
  }, []);

  function resetLocalChatState() {
    setMood(null);
    setPrivacyNotice('');
    setError('');
    setSupportReason('');
    setShowSupport(false);
    setInput('');
  }

  function selectChat(chat: Chat) {
    if (streaming && streamingChatRef.current === activeChat) return;
    resetLocalChatState();
    setMessages([]);
    setActiveChat(chat.id);
    const mode = (chat.handoff_mode || 'ai') as 'ai' | 'human' | 'resolved';
    setHandoffMode(mode);
    setCompanionMode(mode === 'human' || mode === 'resolved' ? 'human' : 'twin');
    setMobileListOpen(false);
  }

  async function loadSelfHelpFromConversation(msgs: Message[], latest?: string) {
    try {
      const recent = msgs
        .filter((m) => m.role === 'user')
        .slice(-3)
        .map((m) => m.content)
        .join(' ');
      const query = (recent || latest || 'bienestar').slice(0, 200);
      let data = await proxyJson<SelfHelp[]>(`/self-help?topic=${encodeURIComponent(query)}`);
      if ((!Array.isArray(data) || data.length === 0) && query !== 'bienestar') {
        data = await proxyJson<SelfHelp[]>('/self-help?topic=bienestar');
      }
      setSelfHelp(Array.isArray(data) ? data.slice(0, 4) : []);
    } catch {
      /* optional */
    }
  }

  async function loadChats() {
    try {
      const data = await proxyJson<Chat[]>('/chats?chat_type=digital_twin');
      const list = Array.isArray(data) ? data : [];
      setChats(list);
      if (list[0]) {
        setActiveChat(list[0].id);
        const mode = (list[0].handoff_mode || 'ai') as 'ai' | 'human' | 'resolved';
        setHandoffMode(mode);
        setCompanionMode(mode === 'human' || mode === 'resolved' ? 'human' : 'twin');
      } else {
        const chat = await proxyJson<Chat>('/chats', {
          method: 'POST',
          body: JSON.stringify({ title: 'Mi espacio seguro', chat_type: 'digital_twin' }),
        });
        setChats([chat]);
        setActiveChat(chat.id);
        setHandoffMode('ai');
        setCompanionMode('twin');
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
      if (activeChatRef.current !== chatId) return;
      let list: Message[] = [];
      let mode: 'ai' | 'human' | 'resolved' = 'ai';
      if (Array.isArray(data)) {
        list = data;
      } else {
        list = data.messages || [];
        mode = (data.chat?.handoff_mode || 'ai') as 'ai' | 'human' | 'resolved';
        setHandoffMode(mode);
        setCompanionMode(mode === 'human' || mode === 'resolved' ? 'human' : 'twin');
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
      if (!silent && activeChatRef.current === chatId) setMessages([]);
    }
  }

  async function newChat() {
    if (streaming) return;
    const chat = await proxyJson<Chat>('/chats', {
      method: 'POST',
      body: JSON.stringify({ title: 'Nueva conversación', chat_type: 'digital_twin' }),
    });
    resetLocalChatState();
    setChats((c) => [chat, ...c]);
    setActiveChat(chat.id);
    setMessages([]);
    setHandoffMode('ai');
    setCompanionMode('twin');
    setCounselor(null);
    setWaitingForCounselor(false);
    setLimitReached(false);
    setMobileListOpen(false);
  }

  async function requestHumanHandoff(reason?: string) {
    if (!activeChat) return;
    try {
      const payload = await proxyJson<HandoffPayload>(`/chats/${activeChat}/handoff`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason || 'Prefiero hablar con una persona' }),
      });
      applyHandoff(payload, activeChat);
      setShowSupport(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo conectar con bienestar');
    }
  }

  async function selectCompanionMode(mode: CompanionMode) {
    if (mode === 'twin') {
      if (handoffMode === 'human' || handoffMode === 'resolved') {
        await newChat();
        return;
      }
      setCompanionMode('twin');
      return;
    }
    setCompanionMode('human');
    if (handoffMode === 'ai' && activeChat) {
      setShowSupport(true);
    }
  }

  async function send() {
    if (!input.trim() || !activeChat || streaming || limitReached || handoffMode === 'resolved') return;
    const chatId = activeChat;
    const content = input.trim();
    setInput('');
    const nextMsgs = [...messages, { id: `u-${Date.now()}`, role: 'user', content }];
    setMessages(nextMsgs);
    setStreaming(true);
    streamingChatRef.current = chatId;
    setError('');

    // Auto-title first user message for this conversation
    const isFirstUser = messages.filter((m) => m.role === 'user').length === 0;
    if (isFirstUser) {
      const title = content.length > 42 ? `${content.slice(0, 42)}…` : content;
      setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, title } : c)));
    }

    let assistant = '';
    try {
      const result = await proxyStream(`/chats/${chatId}/messages`, { content }, {
        onToken: (token) => {
          if (activeChatRef.current !== chatId) return;
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
        onHandoffWaiting: (payload) => applyHandoff(payload, chatId),
        onGuardrail: (payload) => {
          if (activeChatRef.current !== chatId) return;
          if (payload.privacy_notice) setPrivacyNotice(payload.privacy_notice);
        },
      });

      if (activeChatRef.current !== chatId) return;

      if (result.handoff) applyHandoff(result.handoff, chatId);
      if (!assistant.trim() && result.content?.trim()) {
        assistant = result.content.trim();
        setMessages((m) => [...m, { id: `a-${Date.now()}`, role: 'assistant', content: assistant }]);
      }
      if (result.needsHandoff && !result.handoff) {
        await requestHumanHandoff('LLM/proxy no disponible; escalado a bienestar');
      }
      const userCount = nextMsgs.filter((m) => m.role === 'user').length;
      if (userCount >= 15) setLimitReached(true);
      loadSelfHelpFromConversation(nextMsgs, content);
      loadMessages(chatId, true);
    } catch (e) {
      if (activeChatRef.current !== chatId) return;
      const msg = e instanceof Error ? e.message : '';
      const status =
        e && typeof e === 'object' && 'status' in e ? Number((e as { status: number }).status) : 0;
      if (
        status === 409 ||
        msg.includes('409') ||
        msg.toLowerCase().includes('nuevo chat') ||
        msg.toLowerCase().includes('15') ||
        msg.toLowerCase().includes('cerrada')
      ) {
        if (msg.toLowerCase().includes('cerrada')) {
          setHandoffMode('resolved');
          setCompanionMode('human');
          setError('Esta conversación fue cerrada. Inicia una conversación nueva para continuar.');
        } else {
          setLimitReached(true);
          setError('Has alcanzado el límite de 15 mensajes. Inicia una conversación nueva para continuar.');
        }
      } else if (status === 429) {
        setError('Demasiados mensajes. Espera un momento e intenta de nuevo.');
      } else {
        const soft =
          'No pude completar una respuesta automática en este momento. Te estoy conectando con el equipo de bienestar UTB.';
        setMessages((m) => [...m, { id: `a-${Date.now()}`, role: 'assistant', content: soft }]);
        setError('');
        await requestHumanHandoff('Error de red en el chat; escalado a bienestar');
      }
    } finally {
      if (streamingChatRef.current === chatId) {
        streamingChatRef.current = null;
        setStreaming(false);
      }
    }
  }

  async function submitMood(score: number) {
    setMood(score);
    await proxyJson('/mood-checkins', { method: 'POST', body: JSON.stringify({ mood_score: score }) });
  }

  async function requestSupport() {
    await proxyJson('/support-requests', {
      method: 'POST',
      body: JSON.stringify({
        chat_id: activeChat,
        reason: supportReason || 'Solicitud de apoyo psicológico',
      }),
    });
    await requestHumanHandoff(supportReason || 'Solicitud de apoyo psicológico');
    setSupportReason('');
  }

  const counselorLabel = counselor?.full_name || 'Equipo de bienestar UTB';
  const counselorEmail = counselor?.email || PSYCHOLOGIST_EMAIL;
  const chatClosed = handoffMode === 'resolved';
  const MOODS = [
    { score: 5, emoji: '🤩', label: 'Emocionado' },
    { score: 4, emoji: '😊', label: 'Feliz' },
    { score: 3, emoji: '😐', label: 'Neutral' },
    { score: 2, emoji: '😴', label: 'Cansado' },
    { score: 1, emoji: '🤯', label: 'Estresado' },
  ];

  const chatList = (
    <>
      <button
        type="button"
        onClick={newChat}
        disabled={streaming}
        className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-on-primary transition-all hover:bg-primary-container active:scale-95 disabled:opacity-50"
      >
        <Plus className="h-4 w-4" /> Nueva conversación
      </button>
      <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
        Continúa esta conversación
      </p>
      <div className="hide-scrollbar flex-1 space-y-1 overflow-y-auto">
        {chats.map((c) => (
          <button
            key={c.id}
            type="button"
            disabled={streaming && streamingChatRef.current === activeChat && c.id !== activeChat}
            onClick={() => selectChat(c)}
            className={cn(
              'flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors disabled:opacity-50',
              activeChat === c.id
                ? 'bg-primary/10 text-primary'
                : 'text-on-surface-variant hover:bg-surface-container-low',
            )}
          >
            <MessageSquare className="h-4 w-4 shrink-0" />
            <span className="truncate">{c.title}</span>
            {c.handoff_mode === 'human' && (
              <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-emerald-500" title="Con psicólogo" />
            )}
          </button>
        ))}
      </div>
    </>
  );

  return (
    <div className="flex h-screen flex-col pt-16 md:flex-row">
      <aside className="glass-card hidden w-56 shrink-0 flex-col border-r border-outline-variant/10 p-4 lg:flex">
        {chatList}
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="glass-card flex flex-col gap-4 border-b border-outline-variant/10 px-5 py-4">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="animate-floaty flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-lg">
                  {companionMode === 'human' ? <UserRound className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
                </div>
                <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-surface bg-green-500" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-primary">
                  {companionMode === 'human' ? 'Bienestar UTB' : 'Tu Twin UTB'}
                </h1>
                <p className="text-xs text-on-surface-variant">
                  {companionMode === 'human' || handoffMode === 'human'
                    ? `Conectado con ${counselorLabel}`
                    : 'Activo ahora • Acompañamiento personalizado'}
                </p>
              </div>
            </div>

            {/* Twin UTB | Humano toggle */}
            <div className="relative flex w-full max-w-md rounded-xl bg-surface-container-low p-1 md:w-auto md:min-w-[320px]">
              <span
                className="absolute bottom-1 top-1 w-[calc(50%-4px)] rounded-lg bg-surface-container-lowest shadow-sm transition-transform duration-300 ease-out dark:bg-surface-container-highest"
                style={{
                  transform: companionMode === 'human' ? 'translateX(100%)' : 'translateX(0)',
                }}
                aria-hidden="true"
              />
              <button
                type="button"
                onClick={() => selectCompanionMode('twin')}
                disabled={streaming}
                className={cn(
                  'relative z-10 flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-center text-sm font-semibold transition-colors disabled:opacity-50',
                  companionMode === 'twin' ? 'text-primary' : 'text-on-surface-variant',
                )}
              >
                <Brain className="h-4 w-4" />
                Twin UTB
              </button>
              <button
                type="button"
                onClick={() => selectCompanionMode('human')}
                disabled={streaming || chatClosed}
                className={cn(
                  'relative z-10 flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-center text-sm font-semibold transition-colors disabled:opacity-50',
                  companionMode === 'human' ? 'text-primary' : 'text-on-surface-variant',
                )}
              >
                <UserRound className="h-4 w-4" />
                Hablar con un humano
              </button>
            </div>
          </div>

          {/* Mobile chat picker */}
          <div className="lg:hidden">
            <button
              type="button"
              onClick={() => setMobileListOpen((o) => !o)}
              className="flex w-full items-center justify-between rounded-xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-sm font-semibold text-on-surface"
            >
              <span className="truncate">
                {chats.find((c) => c.id === activeChat)?.title || 'Conversaciones'}
              </span>
              <ChevronDown className={cn('h-4 w-4 transition-transform', mobileListOpen && 'rotate-180')} />
            </button>
            {mobileListOpen && (
              <div className="glass-card mt-2 max-h-56 overflow-y-auto rounded-xl p-3">{chatList}</div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-outline-variant/20 bg-surface-container-lowest/60 p-1.5">
            <span className="px-2 text-xs font-bold text-on-surface-variant">¿Cómo te sientes?</span>
            {MOODS.map((m) => (
              <button
                key={m.label}
                type="button"
                title={m.label}
                aria-label={m.label}
                onClick={() => submitMood(m.score)}
                className={cn(
                  'rounded-xl p-2 text-lg transition-all hover:scale-110 active:scale-95',
                  mood === m.score ? 'bg-primary/10 ring-2 ring-primary/40' : 'hover:bg-primary/10',
                )}
              >
                {m.emoji}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 px-5 pt-3">
          <PrivacyBanner />
          {privacyNotice && (
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3 text-sm text-indigo-900 dark:text-indigo-200">
              {privacyNotice}
            </div>
          )}
          {handoffMode === 'human' && (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
              <UserRound className="h-5 w-5 shrink-0 text-emerald-500" />
              <div className="flex-1 text-sm">
                <p className="font-medium">Estás conversando con Bienestar UTB</p>
                <p className="text-xs text-on-surface-variant">
                  {counselorLabel} · {counselorEmail}
                </p>
              </div>
            </div>
          )}
          {(chatClosed || limitReached) && (
            <div className="flex items-center gap-3 rounded-xl border border-outline-variant/40 bg-surface-container-low p-4">
              <AlertCircle className="h-5 w-5 shrink-0 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {chatClosed ? 'Conversación cerrada por bienestar' : 'Límite de conversación alcanzado'}
                </p>
                <p className="text-xs text-on-surface-variant">
                  Inicia un chat nuevo con Twin UTB para continuar.
                </p>
              </div>
              <button
                type="button"
                onClick={newChat}
                className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-on-primary"
              >
                <Plus className="mr-1 inline h-4 w-4" />
                Twin UTB
              </button>
            </div>
          )}
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>

        <div className="hide-scrollbar flex-1 space-y-6 overflow-y-auto p-5">
          {messages.length === 0 && (
            <div className="flex flex-col items-center py-16 text-center">
              <Heart className="mb-3 h-10 w-10 text-primary" />
              <p className="text-on-surface-variant">
                Este es tu espacio seguro con Twin UTB. Cada conversación guarda su propio contexto.
              </p>
            </div>
          )}

          {messages.map((m) =>
            m.role === 'user' ? (
              <div key={m.id} className="ml-auto flex max-w-[85%] flex-row-reverse gap-3 lg:max-w-[70%]">
                <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <User className="h-[18px] w-[18px] text-on-primary" />
                </div>
                <div className="rounded-2xl rounded-br-sm bg-primary p-4 text-on-primary shadow-md">
                  <p className="leading-relaxed">{m.content}</p>
                </div>
              </div>
            ) : (
              <div key={m.id} className="flex max-w-[85%] gap-3 lg:max-w-[70%]">
                <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary-container">
                  <Brain className="h-[18px] w-[18px] text-on-primary" />
                </div>
                <div
                  className={cn(
                    'glass-card w-full rounded-2xl rounded-bl-sm p-4 shadow-sm',
                    m.role === 'counselor' && 'border border-emerald-500/30',
                  )}
                >
                  {m.role === 'counselor' && (
                    <p className="mb-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      {m.author?.full_name || counselorLabel} · {m.author?.email || counselorEmail}
                    </p>
                  )}
                  <div className="leading-relaxed text-on-surface">
                    <LazyMarkdownMessage content={m.content} />
                  </div>
                </div>
              </div>
            ),
          )}

          {waitingForCounselor && handoffMode === 'human' && !streaming && (
            <div className="flex max-w-[70%] gap-3">
              <div className="glass-card rounded-2xl rounded-bl-sm px-5 py-4 text-sm text-on-surface-variant shadow-sm">
                Mensaje enviado. Un psicólogo te responderá aquí mismo en este chat.
              </div>
            </div>
          )}

          {streaming && (
            <div className="flex max-w-[70%] gap-3">
              <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary-container">
                <Brain className="h-[18px] w-[18px] text-on-primary" />
              </div>
              <div className="glass-card flex items-center gap-1.5 rounded-2xl rounded-bl-sm px-5 py-4 shadow-sm">
                <span className="typing-dot h-2 w-2 rounded-full bg-primary" style={{ animationDelay: '0ms' }} />
                <span className="typing-dot h-2 w-2 rounded-full bg-primary" style={{ animationDelay: '200ms' }} />
                <span className="typing-dot h-2 w-2 rounded-full bg-primary" style={{ animationDelay: '400ms' }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="space-y-3 p-5 pt-0">
          <div className="glass-input mx-auto flex max-w-4xl items-end gap-2 rounded-[24px] p-2 shadow-lg">
            <button
              type="button"
              aria-label="Nueva conversación"
              onClick={newChat}
              disabled={streaming}
              className="p-3 text-on-surface-variant transition-colors hover:text-primary disabled:opacity-50"
            >
              <Plus className="h-5 w-5" />
            </button>
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={
                companionMode === 'human' || handoffMode === 'human'
                  ? 'Escribe al equipo de bienestar…'
                  : 'Escribe un mensaje a Twin UTB…'
              }
              disabled={limitReached || chatClosed || streaming}
              className="max-h-32 flex-1 resize-none border-none bg-transparent py-3 focus:outline-none disabled:opacity-50"
            />
            <button
              type="button"
              onClick={send}
              aria-label="Enviar mensaje"
              disabled={streaming || limitReached || chatClosed}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-on-primary shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      <aside className="glass-card hidden h-full w-80 flex-col border-l border-outline-variant/10 xl:flex">
        <div className="border-b border-outline-variant/10 p-6">
          <h3 className="mb-1 text-2xl font-semibold text-primary">Recursos</h3>
          <p className="text-xs text-on-surface-variant">Recomendados para tu camino</p>
        </div>
        <div className="hide-scrollbar flex-1 space-y-6 overflow-y-auto p-6">
          <div>
            <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-on-surface">
              <Heart className="h-5 w-5 text-primary" />
              Bienestar
            </h4>
            {selfHelp.length === 0 ? (
              <p className="text-xs text-on-surface-variant">
                Los recursos cambian según tu conversación.
              </p>
            ) : (
              <div className="space-y-3">
                {selfHelp.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest/60 p-3"
                  >
                    <p className="text-sm font-bold text-primary">{r.title}</p>
                    {r.description && (
                      <p className="mt-1 text-xs text-on-surface-variant">{r.description}</p>
                    )}
                    {r.url && (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
                      >
                        Abrir recurso <ArrowRight className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="bg-surface-container-highest/30 p-6">
          <button
            type="button"
            onClick={() => selectCompanionMode('human')}
            disabled={chatClosed || streaming}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-outline-variant/20 bg-surface-container-lowest py-3 text-on-surface shadow-sm transition-colors hover:bg-surface-container disabled:opacity-50"
          >
            <User className="h-5 w-5" />
            Hablar con un humano
          </button>
        </div>
      </aside>

      {showSupport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-md space-y-4">
            <h3 className="font-semibold text-primary">Hablar con un humano</h3>
            <PrivacyBanner message="Con tu consentimiento, un psicólogo de bienestar UTB te responderá en este mismo chat." />
            <Input
              value={supportReason}
              onChange={(e) => setSupportReason(e.target.value)}
              placeholder="Motivo (opcional)"
            />
            <div className="flex gap-2">
              <Button onClick={requestSupport}>Conectar con bienestar</Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowSupport(false);
                  if (handoffMode === 'ai') setCompanionMode('twin');
                }}
              >
                Cancelar
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
