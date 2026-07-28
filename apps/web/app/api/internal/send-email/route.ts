import {
  sendAccountApprovedEmail,
  sendAccountRejectedEmail,
  sendAppointmentConfirmedEmail,
  sendAppointmentRejectedEmail,
  sendAppointmentRequestedEmail,
} from '@/lib/email';

const VALID_TYPES = [
  'account_approved',
  'account_rejected',
  'appointment_requested',
  'appointment_confirmed',
  'appointment_rejected',
] as const;
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
    const fullName = (body.fullName as string) || (to ? to.split('@')[0] : 'Usuario');

    if (!to || !VALID_TYPES.includes(type)) {
      return Response.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    if (type === 'account_approved') {
      await sendAccountApprovedEmail({
        to,
        fullName,
        role: String(body.role || 'usuario'),
      });
    } else if (type === 'account_rejected') {
      await sendAccountRejectedEmail({
        to,
        fullName,
        reason: body.reason as string | undefined,
      });
    } else if (type === 'appointment_requested') {
      await sendAppointmentRequestedEmail({
        to,
        studentName: fullName,
        studentEmail: String(body.studentEmail || ''),
        proposedAt: String(body.proposedAt || ''),
        reason: body.reason as string | undefined,
        forStudent: Boolean(body.forStudent),
      });
    } else if (type === 'appointment_confirmed') {
      await sendAppointmentConfirmedEmail({
        to,
        studentName: fullName,
        proposedAt: String(body.proposedAt || ''),
        counselorNote: body.counselorNote as string | undefined,
        role: String(body.role || 'student'),
        studentEmail: body.studentEmail as string | undefined,
      });
    } else {
      await sendAppointmentRejectedEmail({
        to,
        studentName: fullName,
        proposedAt: String(body.proposedAt || ''),
        counselorNote: body.counselorNote as string | undefined,
        forCounselor: Boolean(body.forCounselor),
        studentEmail: body.studentEmail as string | undefined,
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
