import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { API_URL } from '@/lib/api';
import { isPathAllowed } from '@/lib/proxy-allowlist';

export const runtime = 'nodejs';
/** LLM + SSE del twin puede superar el default ~10s de Vercel Hobby. */
export const maxDuration = 60;

const CHAT_FALLBACK_TEXT =
  'El servicio está temporalmente limitado. Puedes seguir escribiendo; intentaremos responder en el próximo mensaje.';

const TWIN_HANDOFF_FALLBACK_TEXT =
  'No pude completar una respuesta automática en este momento. Te estoy conectando con el equipo de bienestar UTB para que un psicólogo continúe contigo en este mismo chat.';

/** Solo el Digital Twin hace SSE en POST /chats/{id}/messages (no counselor). */
function isStudentChatSse(path: string): boolean {
  return /^\/chats\/[^/]+\/messages\/?$/.test(path);
}

function isInstitutionalChat(path: string): boolean {
  return path === '/institutional/chat' || path.startsWith('/institutional/chat?');
}

function isDirectorChat(path: string): boolean {
  return path === '/institutional/director/chat' || path.startsWith('/institutional/director/chat?');
}

function isSoftReadPath(path: string): boolean {
  const base = path.split('?')[0];
  return (
    base === '/institutional/dashboard' ||
    base === '/institutional/analytics/dashboard' ||
    base === '/institutional/kpis' ||
    base === '/institutional/actions' ||
    base === '/institutional/prediction' ||
    base === '/institutional/risk/students' ||
    base === '/institutional/care-queue' ||
    base === '/institutional/prediction/ml' ||
    base === '/institutional/impact' ||
    base === '/institutional/executive-brief'
  );
}

interface AuthContext {
  token?: string;
  role: string;
}

// In-memory role cache (persists per server instance). Avoids a Supabase DB
// round-trip on every proxied request; roles rarely change within a session.
const ROLE_TTL_MS = 120_000;
const roleCache = new Map<string, { role: string; expires: number }>();

async function getAuth(): Promise<AuthContext> {
  const supabase = await createClient();

  // Local session token is enough for proxy routing; FastAPI re-validates the JWT.
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token || !session.user?.id) {
    return { token: undefined, role: '' };
  }

  const userId = session.user.id;
  const token = session.access_token;

  const cached = roleCache.get(userId);
  if (cached && cached.expires > Date.now()) {
    return { token, role: cached.role };
  }

  const { data: profile } = await supabase.from('users').select('role').eq('id', userId).single();
  const role = profile?.role || '';
  roleCache.set(userId, { role, expires: Date.now() + ROLE_TTL_MS });
  return { token, role };
}

function authHeaders(token: string | undefined): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function deny(message: string, status = 403) {
  return NextResponse.json({ error: message }, { status });
}

function softDegradedPayload(path: string): Record<string, unknown> {
  if (isInstitutionalChat(path)) {
    return { text: CHAT_FALLBACK_TEXT, chart: null, degraded: true, provider: 'fallback' };
  }
  if (isDirectorChat(path)) {
    return {
      insights:
        'Resumen en modo limitado: revise KPIs de retención y la cola de cuidado. Genere de nuevo cuando el servicio esté disponible.',
      degraded: true,
      provider: 'fallback',
    };
  }
  if (path.split('?')[0] === '/institutional/risk/students') {
    return [];
  }
  if (
    path.split('?')[0] === '/institutional/kpis' ||
    path.split('?')[0] === '/institutional/actions'
  ) {
    return [];
  }
  return {
    kpis: [],
    charts: { enrollment_trend: [], engagement: [] },
    actions: [],
    prediction: {},
    cohort_alerts: [],
    tickets: [],
    degraded: true,
    detail: 'Backend no disponible. Mostrando datos limitados.',
    code: 'proxy_degraded',
  };
}

/** Twin chat: soft SSE tells the client to escalate to psychologist (real handoff via POST /handoff). */
function sseFallbackResponse(): NextResponse {
  const encoder = new TextEncoder();
  const chunks = [
    `event: thinking\ndata: ${JSON.stringify({ message: 'Conectando con bienestar…' })}\n\n`,
    `event: token\ndata: ${JSON.stringify({ token: TWIN_HANDOFF_FALLBACK_TEXT })}\n\n`,
    `event: done\ndata: ${JSON.stringify({
      content: TWIN_HANDOFF_FALLBACK_TEXT,
      counselor: true,
      degraded: true,
      needs_handoff: true,
      provider: 'counselor',
    })}\n\n`,
  ];
  const stream = new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
  return new NextResponse(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

async function authorize(path: string | null): Promise<
  { ok: true; token: string | undefined; path: string } | { ok: false; response: NextResponse }
> {
  if (!path) return { ok: false, response: NextResponse.json({ error: 'path required' }, { status: 400 }) };
  const { token, role } = await getAuth();
  if (!token) return { ok: false, response: deny('No autenticado', 401) };
  if (!isPathAllowed(path, role)) return { ok: false, response: deny('Ruta no permitida') };
  return { ok: true, token, path };
}

async function forward(method: string, path: string, token: string | undefined, body?: string) {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers: body !== undefined
        ? { 'Content-Type': 'application/json', ...authHeaders(token) }
        : authHeaders(token),
      ...(body !== undefined ? { body } : {}),
    });
    const data = await res.json().catch(() => ({}));

    // Soft-degrade operational failures for chats and key institutional reads.
    if (
      !res.ok &&
      res.status >= 500 &&
      (isInstitutionalChat(path) || isDirectorChat(path) || (method === 'GET' && isSoftReadPath(path)))
    ) {
      const soft = softDegradedPayload(path);
      return NextResponse.json(Array.isArray(soft) ? soft : soft, { status: 200 });
    }

    return NextResponse.json(data, { status: res.status });
  } catch {
    if (isInstitutionalChat(path) || isDirectorChat(path) || (method === 'GET' && isSoftReadPath(path))) {
      const soft = softDegradedPayload(path);
      return NextResponse.json(Array.isArray(soft) ? soft : soft, { status: 200 });
    }
    return NextResponse.json(
      { detail: 'Backend no disponible. Intente de nuevo en unos segundos.', degraded: true, code: 'proxy_degraded' },
      { status: 503 },
    );
  }
}

export async function GET(request: NextRequest) {
  const auth = await authorize(request.nextUrl.searchParams.get('path'));
  if (!auth.ok) return auth.response;
  return forward('GET', auth.path, auth.token);
}

export async function POST(request: NextRequest) {
  const auth = await authorize(request.nextUrl.searchParams.get('path'));
  if (!auth.ok) return auth.response;

  const body = await request.text();

  if (isStudentChatSse(auth.path)) {
    try {
      const res = await fetch(`${API_URL}${auth.path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(auth.token) },
        body,
      });
      if (!res.ok) {
        // Business rules (409 limit, 429 rate) stay as JSON errors; 5xx → soft SSE.
        if (res.status >= 500) {
          return sseFallbackResponse();
        }
        const data = await res.json().catch(() => ({ detail: 'Stream error' }));
        return NextResponse.json(data, { status: res.status });
      }
      return new NextResponse(res.body, {
        status: res.status,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    } catch {
      return sseFallbackResponse();
    }
  }

  return forward('POST', auth.path, auth.token, body);
}

export async function PATCH(request: NextRequest) {
  const auth = await authorize(request.nextUrl.searchParams.get('path'));
  if (!auth.ok) return auth.response;
  const body = await request.text();
  return forward('PATCH', auth.path, auth.token, body);
}

export async function DELETE(request: NextRequest) {
  const auth = await authorize(request.nextUrl.searchParams.get('path'));
  if (!auth.ok) return auth.response;
  return forward('DELETE', auth.path, auth.token);
}
