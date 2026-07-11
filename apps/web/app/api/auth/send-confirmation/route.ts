import { shouldSkipOutgoingEmail } from '@/lib/app-config';

const rateLimit = new Map<string, number>();

export async function POST(request: Request) {
  try {
    const { email, full_name } = await request.json();

    if (!email) {
      return Response.json({ error: 'Correo requerido' }, { status: 400 });
    }

    if (shouldSkipOutgoingEmail(email)) {
      return Response.json({ sent: true, skipped: true });
    }

    const now = Date.now();
    const last = rateLimit.get(email) || 0;
    if (now - last < 60_000) {
      return Response.json({ error: 'Espere antes de reenviar' }, { status: 429 });
    }
    rateLimit.set(email, now);

    const { sendConfirmLink } = await import('@/lib/register-server');
    await sendConfirmLink(email, full_name || email.split('@')[0]);

    return Response.json({ sent: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al enviar correo';
    console.error('[send-confirmation]', message);
    return Response.json(
      {
        error: 'Error al enviar correo',
        detail: process.env.NODE_ENV === 'development' ? message : undefined,
      },
      { status: 500 }
    );
  }
}
