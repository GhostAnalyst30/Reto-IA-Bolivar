'use client';

import { createClient } from '@/lib/supabase/client';
import { appendInstitutionQuery } from '@/lib/institution-context';

export class ProxyError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function mapProxyErrorMessage(status: number, detail?: string): string {
  if (detail === 'Not Found') {
    return 'Endpoint no disponible. Verifique que la API esté corriendo y actualizada.';
  }
  if (detail === 'Profile not found' || detail?.includes('Perfil no encontrado')) {
    return 'Perfil no sincronizado. Contacte al administrador o vuelva a iniciar sesión.';
  }
  if (status === 403 && detail === 'Ruta no permitida') {
    return 'No tiene permiso para acceder a este recurso.';
  }
  if (status === 503) {
    return detail || 'Backend no disponible. Intente de nuevo en unos segundos.';
  }
  return detail || `Error de API (${status})`;
}

export async function handleAuthError(status: number) {
  if (status === 401) {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  }
}

export async function proxyJson<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const scopedPath = appendInstitutionQuery(path);
  const res = await fetch(`/api/proxy?path=${encodeURIComponent(scopedPath)}`, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    await handleAuthError(res.status);
    const detail = (data as { detail?: string; error?: string }).detail
      || (data as { error?: string }).error;
    throw new ProxyError(
      mapProxyErrorMessage(res.status, detail),
      res.status
    );
  }
  return data as T;
}

export interface HandoffPayload {
  handoff_mode: string;
  counselor: { id?: string; full_name: string; email: string };
}

export interface StreamCallbacks {
  onThinking?: (message: string) => void;
  onReasoning?: (content: string) => void;
  onToken?: (token: string) => void;
  onHandoffWaiting?: (payload: HandoffPayload) => void;
  onGuardrail?: (payload: { action?: string; privacy_notice?: string; flags?: string[] }) => void;
}

export async function proxyStream(
  path: string,
  body: object,
  callbacks: StreamCallbacks | ((token: string) => void),
): Promise<{ content: string; handoff?: HandoffPayload }> {
  const cb: StreamCallbacks = typeof callbacks === 'function'
    ? { onToken: callbacks }
    : callbacks;

  const scopedPath = appendInstitutionQuery(path);
  const res = await fetch(`/api/proxy?path=${encodeURIComponent(scopedPath)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    await handleAuthError(res.status);
    throw new ProxyError(
      mapProxyErrorMessage(res.status, (data as { detail?: string; error?: string }).detail
        || (data as { error?: string }).error),
      res.status
    );
  }

  const reader = res.body?.getReader();
  if (!reader) throw new ProxyError('No stream', 500);

  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';
  let currentEvent = 'message';
  let handoff: HandoffPayload | undefined;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (line.startsWith('event: ')) {
        currentEvent = line.slice(7).trim();
        continue;
      }
      if (!line.startsWith('data: ')) continue;
      try {
        const parsed = JSON.parse(line.slice(6));
        if (currentEvent === 'thinking' && parsed.message) {
          cb.onThinking?.(parsed.message);
        } else if (currentEvent === 'reasoning' && parsed.content) {
          cb.onReasoning?.(parsed.content);
        } else if (currentEvent === 'handoff_waiting' && parsed.counselor) {
          handoff = parsed as HandoffPayload;
          cb.onHandoffWaiting?.(handoff);
        } else if (currentEvent === 'guardrail') {
          cb.onGuardrail?.(parsed);
        } else if (currentEvent === 'done' && parsed.counselor && parsed.handoff_mode) {
          handoff = parsed as HandoffPayload;
          cb.onHandoffWaiting?.(handoff);
        } else if (parsed.token) {
          full += parsed.token;
          cb.onToken?.(parsed.token);
        }
      } catch {
        /* ignore parse errors */
      }
    }
  }
  return { content: full, handoff };
}
