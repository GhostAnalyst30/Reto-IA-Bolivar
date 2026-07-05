import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import {
  callBackendRegister,
  createAuthUser,
  isUsernameTaken,
  sendConfirmLink,
} from '@/lib/register-server';
import { isUtbEmail, isValidUsername, normalizeUsername } from '@/lib/utb-auth';

const schema = z.object({
  email: z.string().email().max(255),
  username: z.string().min(3).max(30),
  password: z.string().min(8).max(128),
  full_name: z.string().min(2).max(200),
});

export async function POST(request: NextRequest) {
  try {
    const body = schema.parse(await request.json());
    const { email, password, full_name } = body;
    const username = normalizeUsername(body.username);

    if (!isUtbEmail(email)) {
      return NextResponse.json(
        { error: 'Solo se permiten correos institucionales @utb.edu.co' },
        { status: 400 }
      );
    }
    if (!isValidUsername(username)) {
      return NextResponse.json(
        { error: 'Usuario inválido: 3-30 caracteres, letra inicial, minúsculas/números/_' },
        { status: 400 }
      );
    }

    if (await isUsernameTaken(username)) {
      return NextResponse.json(
        { error: 'El nombre de usuario ya está en uso' },
        { status: 409 }
      );
    }

    const userId = await createAuthUser(email, password, full_name, username);

    await callBackendRegister('/register/student', {
      user_id: userId,
      email,
      username,
      full_name,
    });

    await sendConfirmLink(email, full_name);

    return NextResponse.json({ sent: true, user_id: userId });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : 'Error al registrar';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
