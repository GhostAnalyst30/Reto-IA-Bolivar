'use client';

import { useEffect, useState, useRef } from 'react';
import { Button, Card, Input } from '@/components/ui';
import { PrivacyBanner } from '@/components/ui/PrivacyBanner';
import { MarkdownMessage } from '@/components/ui/MarkdownMessage';
import { BentoCell } from '@/components/ui/BentoGrid';
import { Send, Plus, MessageSquare, Heart, Loader2, Phone, AlertCircle } from 'lucide-react';
import { proxyJson, proxyStream } from '@/lib/proxy';

interface Chat { id: string; title: string; updated_at: string }
interface Message { id: string; role: string; content: string }

const OFFLINE_COUNSELOR_REPLY =
  'Hola. Soy **María Fernanda Ortiz** del equipo de bienestar UTB (psicologo.demo@utb.edu.co). '
  + 'Recibí tu mensaje. Este espacio es confidencial: cuéntame con calma qué te preocupa hoy '
  + 'y te acompaño paso a paso.\n\n'
  + '— **Lic. María Fernanda Ortiz**\nPsicóloga · Bienestar estudiantil UTB\n*psicologo.demo@utb.edu.co*';
interface SelfHelp { id: string; title: string; description?: string; url?: string }

export default function TwinChatPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [selfHelp, setSelfHelp] = useState<SelfHelp[]>([]);
  const [mood, setMood] = useState<number | null>(null);
  const [showSupport, setShowSupport] = useState(false);
  const [supportReason, setSupportReason] = useState('');
  const [error, setError] = useState('');
  const [limitReached, setLimitReached] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadChats(); }, []);
  useEffect(() => { if (activeChat) loadMessages(activeChat); }, [activeChat]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

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
      } else {
        const chat = await proxyJson<Chat>('/chats', {
          method: 'POST',
          body: JSON.stringify({ title: 'Mi espacio seguro', chat_type: 'digital_twin' }),
        });
        setChats([chat]);
        setActiveChat(chat.id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar chats');
    }
  }

  async function loadMessages(chatId: string) {
    try {
      const data = await proxyJson<Message[]>(`/chats/${chatId}/messages`);
      const list = Array.isArray(data) ? data : [];
      setMessages(list);
      setLimitReached(list.filter((m) => m.role === 'user').length >= 15);
      loadSelfHelpFromConversation(list);
    } catch { setMessages([]); }
  }

  async function newChat() {
    const chat = await proxyJson<Chat>('/chats', {
      method: 'POST',
      body: JSON.stringify({ title: 'Nueva conversación', chat_type: 'digital_twin' }),
    });
    setChats((c) => [chat, ...c]);
    setActiveChat(chat.id);
    setMessages([]);
    setLimitReached(false);
    setError('');
  }

  async function send() {
    if (!input.trim() || !activeChat || streaming || limitReached) return;
    const content = input.trim();
    setInput('');
    const nextMsgs = [...messages, { id: `u-${Date.now()}`, role: 'user', content }];
    setMessages(nextMsgs);
    setStreaming(true);
    setError('');
    let assistant = '';
    let counselorReply = false;
    try {
      await proxyStream(`/chats/${activeChat}/messages`, { content }, {
        onToken: (token) => {
          assistant += token;
          if (assistant.includes('psicologo.demo@utb.edu.co') || assistant.includes('Bienestar estudiantil UTB')) {
            counselorReply = true;
          }
          setMessages((m) => {
            const copy = [...m];
            const last = copy[copy.length - 1];
            const role = counselorReply ? 'counselor' : 'assistant';
            if (last?.role === 'assistant' || last?.role === 'counselor') {
              copy[copy.length - 1] = { ...last, role, content: assistant };
            } else {
              copy.push({ id: `a-${Date.now()}`, role, content: assistant });
            }
            return copy;
          });
        },
      });
      const userCount = nextMsgs.filter((m) => m.role === 'user').length;
      if (userCount >= 15) setLimitReached(true);
      loadSelfHelpFromConversation(nextMsgs, content);
      if (activeChat) loadMessages(activeChat);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('409') || msg.toLowerCase().includes('nuevo chat') || msg.toLowerCase().includes('15')) {
        setLimitReached(true);
        setError('Has alcanzado el límite de 15 mensajes. Inicia una conversación nueva para continuar.');
      } else {
        setMessages((m) => [
          ...m.filter((x) => x.role !== 'assistant' || x.content !== assistant),
          { id: `c-${Date.now()}`, role: 'counselor', content: OFFLINE_COUNSELOR_REPLY },
        ]);
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
    setShowSupport(false);
    setSupportReason('');
    alert('Tu solicitud fue registrada. El equipo de bienestar UTB te contactará pronto.');
  }

  return (
    <div className="space-y-4">
      <PrivacyBanner />
      {limitReached && (
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
              onClick={() => setActiveChat(c.id)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${
                activeChat === c.id ? 'bg-brand-amber/10 text-brand-amber' : 'hover:bg-brand-bg'
              }`}
            >
              <MessageSquare className="h-4 w-4 shrink-0" /> {c.title}
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
                      Bienestar UTB · psicologo.demo@utb.edu.co
                    </p>
                  )}
                  {m.role === 'assistant' || m.role === 'counselor' ? (
                    <MarkdownMessage content={m.content} />
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            ))}
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
              <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Escribe aquí..." onKeyDown={(e) => e.key === 'Enter' && send()} disabled={limitReached} />
              <Button onClick={send} disabled={streaming || limitReached}><Send className="h-4 w-4" /></Button>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setShowSupport(true)} className="w-full">
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
            <PrivacyBanner message="Con tu consentimiento, compartiremos un resumen con el equipo de bienestar UTB." />
            <Input value={supportReason} onChange={(e) => setSupportReason(e.target.value)} placeholder="Motivo (opcional)" />
            <div className="flex gap-2">
              <Button onClick={requestSupport}>Enviar solicitud</Button>
              <Button variant="secondary" onClick={() => setShowSupport(false)}>Cancelar</Button>
            </div>
          </Card>
        </div>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
