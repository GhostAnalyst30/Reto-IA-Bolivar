'use client';

import { createClient } from '@/lib/supabase/client';

export class ProxyError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function handleAuthError(status: number) {
  if (status === 401 || status === 403) {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  }
}

export async function proxyJson<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/proxy?path=${encodeURIComponent(path)}`, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    await handleAuthError(res.status);
    throw new ProxyError(
      (data as { detail?: string; error?: string }).detail
        || (data as { error?: string }).error
        || 'Error de API',
      res.status
    );
  }
  return data as T;
}

export async function proxyStream(
  path: string,
  body: object,
  onToken: (token: string) => void,
): Promise<string> {
  const res = await fetch(`/api/proxy?path=${encodeURIComponent(path)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    await handleAuthError(res.status);
    throw new ProxyError(
      (data as { detail?: string; error?: string }).detail
        || (data as { error?: string }).error
        || 'Error de stream',
      res.status
    );
  }

  const reader = res.body?.getReader();
  if (!reader) throw new ProxyError('No stream', 500);

  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const parsed = JSON.parse(line.slice(6));
        if (parsed.token) {
          full += parsed.token;
          onToken(parsed.token);
        }
        if (parsed.message) {
          throw new ProxyError(parsed.message, 502);
        }
      } catch (e) {
        if (e instanceof ProxyError) throw e;
      }
    }
  }
  return full;
}
