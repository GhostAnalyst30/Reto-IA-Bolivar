import {
  sendAccountApprovedEmail,
  sendAccountRejectedEmail,
} from '@/lib/email';

const VALID_TYPES = ['account_approved', 'account_rejected'] as const;
type EmailType = (typeof VALID_TYPES)[number];

function verifyInternalKey(request: Request) {
  const key = process.env.INTERNAL_REGISTER_KEY;
  if (!key) return false;
  return request.headers.get('X-Internal-Register-Key') === key;
}

export async function POST(request: Request) {
  if (!verifyInternalKey(request)) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const type = body.type as EmailType;
    const to = body.to as string;
    const fullName = (body.fullName as string) || to.split('@')[0];

    if (!to || !VALID_TYPES.includes(type)) {
      return Response.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    if (type === 'account_approved') {
      await sendAccountApprovedEmail({
        to,
        fullName,
        role: String(body.role || 'usuario'),
      });
    } else {
      await sendAccountRejectedEmail({
        to,
        fullName,
        reason: body.reason as string | undefined,
      });
    }

    return Response.json({ sent: true });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : 'Error al enviar' },
      { status: 500 }
    );
  }
}
