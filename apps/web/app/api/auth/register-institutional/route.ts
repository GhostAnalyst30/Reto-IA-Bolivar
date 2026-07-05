import { NextRequest, NextResponse } from 'next/server';
import {
  callBackendRegister,
  createAuthUser,
  isUsernameTaken,
  sendConfirmLink,
} from '@/lib/register-server';
import { isUtbEmail, isValidUsername, normalizeUsername } from '@/lib/utb-auth';

export async function POST(request: NextRequest) {
  try {
    const { email, username, password, full_name, requested_role, auth_key } =
      await request.json();

    if (!email || !username || !password || !full_name || !requested_role || !auth_key) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    const normalizedUsername = normalizeUsername(username);
    if (!isUtbEmail(email)) {
      return NextResponse.json(
        { error: 'Solo se permiten correos institucionales @utb.edu.co' },
        { status: 400 }
      );
    }
    if (!isValidUsername(normalizedUsername)) {
      return NextResponse.json({ error: 'Nombre de usuario inválido' }, { status: 400 });
    }

    if (await isUsernameTaken(normalizedUsername)) {
      return NextResponse.json(
        { error: 'El nombre de usuario ya está en uso' },
        { status: 409 }
      );
    }

    const userId = await createAuthUser(email, password, full_name, normalizedUsername);

    await callBackendRegister('/register/institutional', {
      user_id: userId,
      email,
      username: normalizedUsername,
      full_name,
      requested_role,
      auth_key,
    });

    // El envío de correo no debe abortar el registro: la cuenta ya existe y el
    // usuario puede reenviar la confirmación desde la pantalla de verificación.
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
