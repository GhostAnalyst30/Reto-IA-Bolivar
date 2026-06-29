'use client';

import { useEffect, useState, useRef } from 'react';
import { Button, Card, Input } from '@/components/ui';
import { Send, Plus, MessageSquare } from 'lucide-react';

interface Chat { id: string; title: string; updated_at: string }
interface Message { id: string; role: string; content: string }

export default function ChatPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadChats(); }, []);

  useEffect(() => {
    if (activeChat) loadMessages(activeChat);
  }, [activeChat]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function loadChats() {
    const res = await fetch('/api/proxy?path=/chats');
    const data = await res.json();
    setChats(data || []);
    if (data?.[0] && !activeChat) setActiveChat(data[0].id);
  }

  async function loadMessages(chatId: string) {
    const res = await fetch(`/api/proxy?path=/chats/${chatId}/messages`);
    const data = await res.json();
    setMessages(data || []);
  }

  async function newChat() {
    const res = await fetch('/api/proxy?path=/chats', {
      method: 'POST',
      body: JSON.stringify({ title: 'Nueva conversación' }),
    });
    const chat = await res.json();
    setChats((c) => [chat, ...c]);
    setActiveChat(chat.id);
    setMessages([]);
  }

  async function send() {
    if (!input.trim() || !activeChat || streaming) return;
    const content = input.trim();
    setInput('');
    setMessages((m) => [...m, { id: 'tmp', role: 'user', content }]);
    setStreaming(true);

    let assistant = '';
    setMessages((m) => [...m, { id: 'tmp2', role: 'assistant', content: '' }]);

    try {
      const res = await fetch(`/api/proxy?path=/chats/${activeChat}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('No stream');

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n');
        buffer = parts.pop() || '';
        for (const line of parts) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.token) {
                assistant += data.token;
                setMessages((m) => {
                  const copy = [...m];
                  copy[copy.length - 1] = { id: 'tmp2', role: 'assistant', content: assistant };
                  return copy;
                });
              }
            } catch { /* skip */ }
          }
        }
      }
      loadMessages(activeChat);
    } catch {
      setMessages((m) => [...m.slice(0, -1), { id: 'err', role: 'assistant', content: 'Error al conectar con el tutor IA.' }]);
    }
    setStreaming(false);
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      <Card className="hidden w-64 flex-shrink-0 flex-col overflow-hidden p-0 md:flex">
        <div className="border-b border-brand-border p-3">
          <Button size="sm" className="w-full" onClick={newChat}><Plus className="mr-1 h-4 w-4" />Nuevo chat</Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {chats.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveChat(c.id)}
              className={`mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${activeChat === c.id ? 'bg-brand-amber/10 text-brand-amber' : 'text-zinc-400 hover:bg-brand-bg'}`}
            >
              <MessageSquare className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{c.title}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card className="flex flex-1 flex-col overflow-hidden p-0">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <p className="text-center text-zinc-500 py-12">Pregunta algo a tu tutor IA institucional</p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${m.role === 'user' ? 'bg-brand-amber/20 text-white' : 'bg-brand-bg text-zinc-300'}`}>
                {m.content}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="border-t border-brand-border p-4 flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Escribe tu pregunta..." disabled={streaming || !activeChat} />
          <Button onClick={send} disabled={streaming || !activeChat}><Send className="h-4 w-4" /></Button>
        </div>
      </Card>
    </div>
  );
}
