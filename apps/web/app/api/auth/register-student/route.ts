import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import {
  callBackendRegister,
  createAuthUser,
  sendConfirmLink,
} from '@/lib/register-server';
import { isUtbEmail, normalizeUtbEmail } from '@/lib/utb-auth';

const schema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  full_name: z.string().min(2).max(200),
});

export async function POST(request: NextRequest) {
  try {
    const body = schema.parse(await request.json());
    const email = normalizeUtbEmail(body.email);
    const { password, full_name } = body;

    if (!isUtbEmail(email)) {
      return NextResponse.json(
        { error: 'Solo se permiten correos institucionales @utb.edu.co' },
        { status: 400 }
      );
    }

    const userId = await createAuthUser(email, password, full_name);

    const registerResult = await callBackendRegister('/register/student', {
      user_id: userId,
      email,
      full_name,
    });

    if (registerResult?.status === 'approved') {
      return NextResponse.json({
        sent: true,
        already_approved: true,
        email_sent: false,
        user_id: userId,
      });
    }

    // El envío de correo no debe abortar el registro: la cuenta ya existe y el
    // usuario puede reenviar la confirmación desde la pantalla de verificación.
    let emailSent = true;
    try {
      await sendConfirmLink(email, full_name);
    } catch (mailErr) {
      emailSent = false;
      console.error('[register-student] No se pudo enviar la confirmación:', mailErr);
    }

    return NextResponse.json({ sent: true, email_sent: emailSent, user_id: userId });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : 'Error al registrar';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
