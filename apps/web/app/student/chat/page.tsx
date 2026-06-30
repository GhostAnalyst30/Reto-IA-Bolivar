'use client';

import { useEffect, useState, useRef } from 'react';
import { Button, Card, Input } from '@/components/ui';
import { BentoCell } from '@/components/ui/BentoGrid';
import { Send, Plus, MessageSquare, Brain, Loader2 } from 'lucide-react';
import { proxyJson, proxyStream } from '@/lib/proxy';

interface Chat { id: string; title: string; updated_at: string }
interface Message {
  id: string;
  role: string;
  content: string;
  thinking?: string;
  reasoning?: string;
}

export default function ChatPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [phase, setPhase] = useState('');
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadChats(); }, []);

  useEffect(() => {
    if (activeChat) loadMessages(activeChat);
  }, [activeChat]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, phase]);

  async function loadChats() {
    try {
      const data = await proxyJson<Chat[]>('/chats');
      setChats(data || []);
      if (data?.[0]) {
        setActiveChat(data[0].id);
      } else {
        const chat = await proxyJson<Chat>('/chats', {
          method: 'POST',
          body: JSON.stringify({ title: 'Nueva conversación' }),
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
      setMessages(Array.isArray(data) ? data : []);
    } catch {
      setMessages([]);
    }
  }

  async function newChat() {
    try {
      const chat = await proxyJson<Chat>('/chats', {
        method: 'POST',
        body: JSON.stringify({ title: 'Nueva conversación' }),
      });
      setChats((c) => [chat, ...c]);
      setActiveChat(chat.id);
      setMessages([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear chat');
    }
  }

  async function send() {
    if (!input.trim() || !activeChat || streaming) return;
    const content = input.trim();
    setInput('');
    setError('');
    setPhase('Analizando…');
    setMessages((m) => [...m, { id: 'tmp', role: 'user', content }]);
    setStreaming(true);

    setMessages((m) => [...m, { id: 'tmp2', role: 'assistant', content: '', thinking: '', reasoning: '' }]);

    try {
      await proxyStream(
        `/chats/${activeChat}/messages`,
        { content },
        {
          onThinking: (msg) => setPhase(msg),
          onReasoning: (r) => {
            setPhase('');
            setMessages((m) => {
              const copy = [...m];
              const last = copy[copy.length - 1];
              copy[copy.length - 1] = { ...last, reasoning: r };
              return copy;
            });
          },
          onToken: (token) => {
            setPhase('');
            setMessages((m) => {
              const copy = [...m];
              const last = copy[copy.length - 1];
              copy[copy.length - 1] = { ...last, content: last.content + token };
              return copy;
            });
          },
        },
      );
      loadMessages(activeChat);
    } catch {
      setMessages((m) => [
        ...m.slice(0, -1),
        { id: 'err', role: 'assistant', content: 'Lo siento, el servidor no funciona' },
      ]);
    }
    setPhase('');
    setStreaming(false);
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      <BentoCell animate={false} className="hidden w-64 flex-shrink-0 flex-col overflow-hidden p-0 md:flex">
        <div className="border-b border-brand-border p-3">
          <Button size="sm" className="w-full" onClick={newChat}><Plus className="mr-1 h-4 w-4" />Nuevo chat</Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {chats.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveChat(c.id)}
              className={`mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${activeChat === c.id ? 'bg-brand-amber/10 text-brand-amber' : 'text-zinc-500 hover:bg-brand-bg'}`}
            >
              <MessageSquare className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{c.title}</span>
            </button>
          ))}
        </div>
      </BentoCell>

      <BentoCell animate={false} className="flex flex-1 flex-col overflow-hidden p-0">
        {error && <p className="border-b border-brand-border px-4 py-2 text-sm text-red-400">{error}</p>}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <p className="text-center text-zinc-500 py-12">Pregunta algo a tu tutor IA institucional UTB</p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${m.role === 'user' ? 'bg-brand-amber/20' : 'bg-brand-bg border border-brand-border'}`}>
                {m.role === 'assistant' && phase && i === messages.length - 1 && (
                  <div className="mb-2 flex items-center gap-2 text-brand-amber text-xs">
                    <Loader2 className="h-3 w-3 animate-spin" /> {phase}
                  </div>
                )}
                {m.reasoning && (
                  <details className="mb-2 rounded-lg border border-brand-amber/30 bg-brand-amber/5 p-2 text-xs text-zinc-500">
                    <summary className="cursor-pointer flex items-center gap-1 font-medium text-brand-amber">
                      <Brain className="h-3 w-3" /> Razonamiento
                    </summary>
                    <p className="mt-2 whitespace-pre-wrap">{m.reasoning}</p>
                  </details>
                )}
                {m.content}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="border-t border-brand-border p-4 flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Escribe tu pregunta..." disabled={streaming || !activeChat} />
          <Button onClick={send} disabled={streaming || !activeChat} aria-label="Enviar"><Send className="h-4 w-4" /></Button>
        </div>
      </BentoCell>
    </div>
  );
}
