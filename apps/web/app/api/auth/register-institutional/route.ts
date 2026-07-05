import { NextRequest, NextResponse } from 'next/server';
import {
  callBackendRegister,
  createAuthUser,
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

    const userId = await createAuthUser(email, password, full_name, normalizedUsername);

    await callBackendRegister('/register/institutional', {
      user_id: userId,
      email,
      username: normalizedUsername,
      full_name,
      requested_role,
      auth_key,
    });

    await sendConfirmLink(email, full_name);

    return NextResponse.json({ sent: true, user_id: userId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al registrar';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
