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

const SOFT_CHAT_FALLBACK =
  'El servicio está temporalmente limitado. Puedes seguir escribiendo; intentaremos responder en el próximo mensaje.';

const TWIN_HANDOFF_FALLBACK =
  'No pude completar una respuesta automática en este momento. Te estoy conectando con el equipo de bienestar UTB para que un psicólogo continúe contigo en este mismo chat.';

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

/** Only force logout on clear session failures, not ambiguous proxy glitches. */
export async function handleAuthError(status: number, detail?: string) {
  if (status !== 401) return;
  const explicit =
    !detail ||
    detail === 'No autenticado' ||
    detail.toLowerCase().includes('not authenticated') ||
    detail.toLowerCase().includes('invalid jwt') ||
    detail.toLowerCase().includes('jwt') ||
    detail.toLowerCase().includes('session');
  if (!explicit) return;
  const supabase = createClient();
  await supabase.auth.signOut();
  window.location.href = '/login';
}

export type ProxyJsonOptions = RequestInit & {
  /** When true, 5xx/network return null instead of throwing (for non-critical reads). */
  soft?: boolean;
};

export async function proxyJson<T = unknown>(path: string, options: ProxyJsonOptions = {}): Promise<T> {
  const { soft, ...init } = options;
  const scopedPath = appendInstitutionQuery(path);
  try {
    const res = await fetch(`/api/proxy?path=${encodeURIComponent(scopedPath)}`, init);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail = (data as { detail?: string; error?: string }).detail
        || (data as { error?: string }).error;
      await handleAuthError(res.status, detail);
      if (soft && res.status >= 500) {
        return { ...(typeof data === 'object' && data ? data : {}), degraded: true } as T;
      }
      throw new ProxyError(
        mapProxyErrorMessage(res.status, detail),
        res.status
      );
    }
    return data as T;
  } catch (e) {
    if (e instanceof ProxyError) throw e;
    if (soft) {
      return { degraded: true } as T;
    }
    throw new ProxyError('Backend no disponible. Intente de nuevo en unos segundos.', 503);
  }
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

function softTwinHandoffResult(
  cb: StreamCallbacks,
): { content: string; handoff?: HandoffPayload; degraded?: boolean; needsHandoff?: boolean } {
  cb.onToken?.(TWIN_HANDOFF_FALLBACK);
  return { content: TWIN_HANDOFF_FALLBACK, degraded: true, needsHandoff: true };
}

export async function proxyStream(
  path: string,
  body: object,
  callbacks: StreamCallbacks | ((token: string) => void),
): Promise<{ content: string; handoff?: HandoffPayload; degraded?: boolean; needsHandoff?: boolean }> {
  const cb: StreamCallbacks = typeof callbacks === 'function'
    ? { onToken: callbacks }
    : callbacks;

  const scopedPath = appendInstitutionQuery(path);
  const isTwinChatMessages = /^\/chats\/[^/]+\/messages\/?$/.test(path.split('?')[0]);
  let res: Response;
  try {
    res = await fetch(`/api/proxy?path=${encodeURIComponent(scopedPath)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    if (isTwinChatMessages) return softTwinHandoffResult(cb);
    cb.onToken?.(SOFT_CHAT_FALLBACK);
    return { content: SOFT_CHAT_FALLBACK, degraded: true };
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const detail = (data as { detail?: string; error?: string }).detail
      || (data as { error?: string }).error;
    await handleAuthError(res.status, detail);

    // Twin chat: escalate to psychologist. Other chats keep soft degrade.
    if (res.status >= 500) {
      if (isTwinChatMessages) return softTwinHandoffResult(cb);
      cb.onToken?.(SOFT_CHAT_FALLBACK);
      return { content: SOFT_CHAT_FALLBACK, degraded: true };
    }

    throw new ProxyError(
      mapProxyErrorMessage(res.status, detail),
      res.status
    );
  }

  const reader = res.body?.getReader();
  if (!reader) {
    if (isTwinChatMessages) return softTwinHandoffResult(cb);
    cb.onToken?.(SOFT_CHAT_FALLBACK);
    return { content: SOFT_CHAT_FALLBACK, degraded: true };
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';
  let currentEvent = 'message';
  let handoff: HandoffPayload | undefined;
  let degraded = false;
  let needsHandoff = false;

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
        } else if (currentEvent === 'done') {
          if (parsed.degraded) degraded = true;
          if (parsed.needs_handoff || (parsed.counselor && !parsed.handoff_mode)) {
            needsHandoff = true;
          }
          if (parsed.counselor && parsed.handoff_mode) {
            handoff = parsed as HandoffPayload;
            cb.onHandoffWaiting?.(handoff);
          }
          if (parsed.content && !full) {
            full = parsed.content;
          }
        } else if (parsed.token) {
          full += parsed.token;
          cb.onToken?.(parsed.token);
        }
      } catch {
        /* ignore parse errors */
      }
    }
  }

  if (!full.trim()) {
    if (isTwinChatMessages) {
      return { ...softTwinHandoffResult(cb), handoff };
    }
    cb.onToken?.(SOFT_CHAT_FALLBACK);
    return { content: SOFT_CHAT_FALLBACK, degraded: true, handoff };
  }

  return { content: full, handoff, degraded, needsHandoff };
}
