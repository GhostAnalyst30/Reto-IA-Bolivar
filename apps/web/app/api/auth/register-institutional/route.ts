import { NextRequest, NextResponse } from 'next/server';
import {
  callBackendRegister,
  createAuthUser,
  sendConfirmLink,
} from '@/lib/register-server';
import { isUtbEmail, normalizeUtbEmail } from '@/lib/utb-auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = normalizeUtbEmail(body.email || '');
    const { password, full_name, requested_role, auth_key } = body;

    if (!email || !password || !full_name || !requested_role || !auth_key) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    if (!isUtbEmail(email)) {
      return NextResponse.json(
        { error: 'Solo se permiten correos institucionales @utb.edu.co' },
        { status: 400 }
      );
    }

    const userId = await createAuthUser(email, password, full_name, {
      pendingRole: requested_role,
    });

    const registerResult = await callBackendRegister('/register/institutional', {
      user_id: userId,
      email,
      full_name,
      requested_role,
      auth_key,
    });

    if (registerResult?.status === 'approved') {
      return NextResponse.json({
        sent: true,
        already_approved: true,
        email_sent: false,
        user_id: userId,
      });
    }

    let emailSent = true;
    try {
      await sendConfirmLink(email, full_name);
    } catch (mailErr) {
      emailSent = false;
      console.error('[register-institutional] No se pudo enviar la confirmación:', mailErr);
    }

    return NextResponse.json({ sent: true, email_sent: emailSent, user_id: userId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al registrar';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
